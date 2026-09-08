-- Migration: 20260908050000_looks_explore_and_comments.sql
-- Description: Adds like_count on looks, triggers, look_comments table with RLS and abuse controls, and trending looks RPC.

-- 1. Like count on looks
alter table public.looks
  add column if not exists like_count integer not null default 0;

-- Backfill like counts for existing public and private looks
update public.looks l
set like_count = coalesce((
  select count(*)::int from public.likes k
  where k.target_type = 'look' and k.target_id::text = l.id::text
), 0);

-- Protect looks.like_count from direct client updates
create or replace function public.trg_looks_protect_like_count()
returns trigger as $$
begin
  if new.like_count is distinct from old.like_count
     and current_setting('looms.updating_like_count', true) is distinct from '1' then
    new.like_count := old.like_count;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_looks_protect_like_count on public.looks;
create trigger trg_looks_protect_like_count
  before update on public.looks
  for each row execute procedure public.trg_looks_protect_like_count();

-- Like count increment and decrement triggers for looks
create or replace function public.trg_likes_look_count_ins()
returns trigger as $$
begin
  if new.target_type = 'look' then
    perform set_config('looms.updating_like_count', '1', true);
    update public.looks
       set like_count = like_count + 1
     where id::text = new.target_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.trg_likes_look_count_del()
returns trigger as $$
begin
  if old.target_type = 'look' then
    perform set_config('looms.updating_like_count', '1', true);
    update public.looks
       set like_count = greatest(like_count - 1, 0)
     where id::text = old.target_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_likes_look_count_ins on public.likes;
create trigger trg_likes_look_count_ins
  after insert on public.likes
  for each row execute procedure public.trg_likes_look_count_ins();

drop trigger if exists trg_likes_look_count_del on public.likes;
create trigger trg_likes_look_count_del
  after delete on public.likes
  for each row execute procedure public.trg_likes_look_count_del();

-- 2. Look Comments Table
create table if not exists public.look_comments (
  id uuid primary key default gen_random_uuid(),
  look_id uuid not null references public.looks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.look_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint look_comments_body_len check (char_length(body) between 1 and 500)
);

create index if not exists idx_look_comments_look_created
  on public.look_comments (look_id, created_at asc);
create index if not exists idx_look_comments_parent
  on public.look_comments (parent_id)
  where parent_id is not null;
create index if not exists idx_look_comments_user_created
  on public.look_comments (user_id, created_at desc);

alter table public.look_comments enable row level security;

-- One-level replies only
create or replace function public.trg_look_comments_reply_depth()
returns trigger as $$
declare
  v_parent public.look_comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into v_parent
    from public.look_comments
   where id = new.parent_id;

  if not found then
    raise exception 'Parent comment not found.'
      using errcode = 'P0001';
  end if;

  if v_parent.parent_id is not null then
    raise exception 'Replies cannot be nested more than one level.'
      using errcode = 'P0001';
  end if;

  if v_parent.look_id is distinct from new.look_id then
    raise exception 'Reply must target a comment on the same look.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_look_comments_reply_depth on public.look_comments;
create trigger trg_look_comments_reply_depth
  before insert or update of parent_id, look_id on public.look_comments
  for each row execute procedure public.trg_look_comments_reply_depth();

-- Touch updated_at
create or replace function public.trg_look_comments_touch_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_look_comments_touch_updated on public.look_comments;
create trigger trg_look_comments_touch_updated
  before update of body on public.look_comments
  for each row execute procedure public.trg_look_comments_touch_updated();

-- Extend check_user_quota for look_comments
create or replace function public.check_user_quota(
  p_table text,
  p_max_rows integer
)
returns void as $$
declare
  v_user_id uuid;
  v_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  if p_table = 'garments' then
    select count(*) into v_count from public.garments where user_id = v_user_id;
  elsif p_table = 'looks' then
    select count(*) into v_count from public.looks where user_id = v_user_id;
  elsif p_table = 'likes' then
    select count(*) into v_count from public.likes where user_id = v_user_id;
  elsif p_table = 'wardrobe_items' then
    select count(*) into v_count from public.wardrobe_items where user_id = v_user_id;
  elsif p_table = 'garment_comments' then
    select count(*) into v_count from public.garment_comments where user_id = v_user_id;
  elsif p_table = 'look_comments' then
    select count(*) into v_count from public.look_comments where user_id = v_user_id;
  else
    return;
  end if;

  if v_count >= p_max_rows then
    raise exception 'Account quota exceeded: maximum % % allowed per account. Please remove older items before creating new ones.',
      p_max_rows, p_table
      using errcode = 'P0001';
  end if;
end;
$$ language plpgsql security definer;

-- Rate limit and quota trigger
create or replace function public.trg_look_comments_rate_limit_and_quota()
returns trigger as $$
begin
  perform public.check_user_quota('look_comments', 2000);
  perform public.check_rate_limit('comment_create', 30, 600);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_look_comments_rate_limit on public.look_comments;
create trigger trg_look_comments_rate_limit
  before insert on public.look_comments
  for each row execute procedure public.trg_look_comments_rate_limit_and_quota();

-- Target guard: look must exist and be public (or owned by current user)
create or replace function public.trg_look_comments_target_guard()
returns trigger as $$
declare
  v_visibility text;
  v_owner uuid;
begin
  select visibility, user_id into v_visibility, v_owner
    from public.looks
   where id = new.look_id;

  if not found then
    raise exception 'Look not found.'
      using errcode = 'P0001';
  end if;

  if v_visibility is distinct from 'public' and v_owner is distinct from auth.uid() then
    raise exception 'Comments are only allowed on public looks.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_look_comments_target_guard on public.look_comments;
create trigger trg_look_comments_target_guard
  before insert on public.look_comments
  for each row execute procedure public.trg_look_comments_target_guard();

-- RLS policies for look_comments
drop policy if exists "Comments on public looks are viewable by everyone." on public.look_comments;
create policy "Comments on public looks are viewable by everyone."
  on public.look_comments for select
  using (
    exists (
      select 1 from public.looks l
       where l.id = look_comments.look_id
         and (l.visibility = 'public' or l.user_id = auth.uid())
    )
  );

drop policy if exists "Users can insert own look comments." on public.look_comments;
create policy "Users can insert own look comments."
  on public.look_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own look comments." on public.look_comments;
create policy "Users can update own look comments."
  on public.look_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authors or look owners can delete look comments." on public.look_comments;
create policy "Authors or look owners can delete look comments."
  on public.look_comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.looks l
       where l.id = look_comments.look_id
         and l.user_id = auth.uid()
    )
  );

-- 3. Top trending looks past day query
create or replace function public.get_trending_looks_past_day(
  p_limit integer default 3
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  description text,
  visibility text,
  stack text[],
  body_id text,
  body_hue integer,
  model text,
  like_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  recent_like_count bigint,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.user_id,
    l.name,
    l.description,
    l.visibility,
    l.stack,
    l.body_id,
    l.body_hue,
    l.model,
    l.like_count,
    l.created_at,
    l.updated_at,
    coalesce(recent.count, 0) as recent_like_count,
    p.username,
    p.avatar_url
  from public.looks l
  join public.profiles p on p.id = l.user_id
  left join (
    select target_id, count(*)::bigint as count
    from public.likes
    where target_type = 'look'
      and created_at >= now() - interval '24 hours'
    group by target_id
  ) recent on recent.target_id = l.id::text
  where l.visibility = 'public'
  order by
    coalesce(recent.count, 0) desc,
    l.like_count desc,
    l.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_trending_looks_past_day(integer) to anon, authenticated;
