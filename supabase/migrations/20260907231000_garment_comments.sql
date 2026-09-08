-- garment_comments: flat comments + one-level replies on public garments.

create table if not exists public.garment_comments (
  id uuid primary key default gen_random_uuid(),
  garment_id text not null references public.garments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.garment_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint garment_comments_body_len check (char_length(body) between 1 and 500)
);

create index if not exists idx_garment_comments_garment_created
  on public.garment_comments (garment_id, created_at asc);
create index if not exists idx_garment_comments_parent
  on public.garment_comments (parent_id)
  where parent_id is not null;
create index if not exists idx_garment_comments_user_created
  on public.garment_comments (user_id, created_at desc);

alter table public.garment_comments enable row level security;

-- One-level replies only: parent must be a top-level comment on the same garment
create or replace function public.trg_garment_comments_reply_depth()
returns trigger as $$
declare
  v_parent public.garment_comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into v_parent
    from public.garment_comments
   where id = new.parent_id;

  if not found then
    raise exception 'Parent comment not found.'
      using errcode = 'P0001';
  end if;

  if v_parent.parent_id is not null then
    raise exception 'Replies cannot be nested more than one level.'
      using errcode = 'P0001';
  end if;

  if v_parent.garment_id is distinct from new.garment_id then
    raise exception 'Reply must target a comment on the same garment.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_garment_comments_reply_depth on public.garment_comments;
create trigger trg_garment_comments_reply_depth
  before insert or update of parent_id, garment_id on public.garment_comments
  for each row execute procedure public.trg_garment_comments_reply_depth();

create or replace function public.trg_garment_comments_touch_updated()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_garment_comments_touch_updated on public.garment_comments;
create trigger trg_garment_comments_touch_updated
  before update of body on public.garment_comments
  for each row execute procedure public.trg_garment_comments_touch_updated();

-- Extend quota helper
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

create or replace function public.trg_garment_comments_rate_limit_and_quota()
returns trigger as $$
begin
  perform public.check_user_quota('garment_comments', 2000);
  perform public.check_rate_limit('comment_create', 30, 600);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_garment_comments_rate_limit on public.garment_comments;
create trigger trg_garment_comments_rate_limit
  before insert on public.garment_comments
  for each row execute procedure public.trg_garment_comments_rate_limit_and_quota();

-- Only comment on public garments (or own private uploads)
create or replace function public.trg_garment_comments_target_guard()
returns trigger as $$
declare
  v_public boolean;
  v_owner uuid;
begin
  select is_public, user_id into v_public, v_owner
    from public.garments
   where id = new.garment_id;

  if not found then
    raise exception 'Garment not found.'
      using errcode = 'P0001';
  end if;

  if v_public is not true and v_owner is distinct from auth.uid() then
    raise exception 'Comments are only allowed on public garments.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_garment_comments_target_guard on public.garment_comments;
create trigger trg_garment_comments_target_guard
  before insert on public.garment_comments
  for each row execute procedure public.trg_garment_comments_target_guard();

drop policy if exists "Comments on public garments are viewable by everyone." on public.garment_comments;
create policy "Comments on public garments are viewable by everyone."
  on public.garment_comments for select
  using (
    exists (
      select 1 from public.garments g
       where g.id = garment_comments.garment_id
         and (g.is_public = true or g.user_id = auth.uid())
    )
  );

drop policy if exists "Users can insert own comments." on public.garment_comments;
create policy "Users can insert own comments."
  on public.garment_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own comments." on public.garment_comments;
create policy "Users can update own comments."
  on public.garment_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authors or garment owners can delete comments." on public.garment_comments;
create policy "Authors or garment owners can delete comments."
  on public.garment_comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.garments g
       where g.id = garment_comments.garment_id
         and g.user_id = auth.uid()
    )
  );
