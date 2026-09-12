-- Notifications: trigger-written inbox for likes, comments, and replies.
-- Clients read and flip `read` only; every insert path is a definer trigger.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'reply')),
  target_type text not null check (target_type in ('garment', 'look')),
  target_id text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id) where read = false;

alter table public.notifications enable row level security;

revoke all on table public.notifications from public;
grant select, update, delete on table public.notifications to authenticated;
revoke insert, truncate, references, trigger
  on table public.notifications from anon, authenticated;

drop policy if exists "Users can view own notifications." on public.notifications;
create policy "Users can view own notifications."
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read." on public.notifications;
create policy "Users can mark own notifications read."
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications." on public.notifications;
create policy "Users can delete own notifications."
  on public.notifications for delete
  using (auth.uid() = user_id);

-- No insert policy: only definer triggers write rows.

-- Per-type preferences live on profiles so the triggers can enforce them.
alter table public.profiles
  add column if not exists notify_likes boolean not null default true,
  add column if not exists notify_comments boolean not null default true,
  add column if not exists notify_replies boolean not null default true;

-- Cap the unread inbox so a like-flood cannot grow a recipient's rows without
-- bound. Keeps the newest 200 unread for this recipient.
create or replace function public.trg_notifications_apply_unread_cap(p_recipient uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cutoff timestamptz;
  v_cutoff_id uuid;
begin
  select created_at, id into v_cutoff, v_cutoff_id
    from public.notifications
   where user_id = p_recipient
     and read = false
   order by created_at desc, id desc
   offset 199
   limit 1;

  if v_cutoff_id is not null then
    delete from public.notifications
     where user_id = p_recipient
       and read = false
       and (created_at < v_cutoff
            or (created_at = v_cutoff and id <= v_cutoff_id));
  end if;
end;
$$;

revoke all on function public.trg_notifications_apply_unread_cap(uuid) from public, anon;

-- 30-day expiry plus cleanup of rows whose target content vanished.
create or replace function public.purge_old_notifications()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.notifications
   where created_at < now() - interval '30 days';

  delete from public.notifications n
   where n.target_type = 'garment'
     and not exists (select 1 from public.garments g where g.id = n.target_id);

  delete from public.notifications n
   where n.target_type = 'look'
     and not exists (select 1 from public.looks l where l.id = n.target_id);
end;
$$;

revoke all on function public.purge_old_notifications() from public, anon;

-- Shared insert helper: respects preferences, suppresses self-actions,
-- caps the unread inbox, and opportunistically purges old rows.
create or replace function public.trg_notifications_insert(
  p_recipient uuid,
  p_actor uuid,
  p_type text,
  p_target_type text,
  p_target_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
begin
  if p_recipient is null or p_actor is null or p_recipient = p_actor then
    return;
  end if;

  select case p_type
           when 'like' then notify_likes
           when 'comment' then notify_comments
           when 'reply' then notify_replies
           else false
         end
    into v_allowed
    from public.profiles
   where id = p_recipient;

  if v_allowed is not true then
    return;
  end if;

  insert into public.notifications (user_id, actor_id, type, target_type, target_id)
  values (p_recipient, p_actor, p_type, p_target_type, p_target_id);

  perform public.trg_notifications_apply_unread_cap(p_recipient);

  -- 2% dice: opportunistic purge, same pattern as check_rate_limit.
  if random() < 0.02 then
    perform public.purge_old_notifications();
  end if;
end;
$$;

revoke all on function public.trg_notifications_insert(uuid, uuid, text, text, text)
  from public, anon;

-- Likes: notify the owner of the liked garment or look.
create or replace function public.trg_notifications_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
begin
  if new.target_type = 'garment' then
    select user_id into v_owner from public.garments where id = new.target_id;
  elsif new.target_type = 'look' then
    select user_id into v_owner from public.looks where id = new.target_id;
  end if;

  perform public.trg_notifications_insert(
    v_owner, new.user_id, 'like', new.target_type, new.target_id
  );
  return new;
end;
$$;

revoke all on function public.trg_notifications_like() from public, anon;

drop trigger if exists trg_likes_notify on public.likes;
create trigger trg_likes_notify
  after insert on public.likes
  for each row execute procedure public.trg_notifications_like();

-- Garment comments: notify the garment owner, or the parent author on replies.
create or replace function public.trg_notifications_garment_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_parent_author uuid;
begin
  select user_id into v_owner from public.garments where id = new.garment_id;

  if new.parent_id is null then
    perform public.trg_notifications_insert(
      v_owner, new.user_id, 'comment', 'garment', new.garment_id
    );
  else
    select user_id into v_parent_author
      from public.garment_comments
     where id = new.parent_id;

    perform public.trg_notifications_insert(
      v_parent_author, new.user_id, 'reply', 'garment', new.garment_id
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_notifications_garment_comment() from public, anon;

drop trigger if exists trg_garment_comments_notify on public.garment_comments;
create trigger trg_garment_comments_notify
  after insert on public.garment_comments
  for each row execute procedure public.trg_notifications_garment_comment();

-- Look comments: same shape as garment comments.
create or replace function public.trg_notifications_look_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_owner uuid;
  v_parent_author uuid;
begin
  select user_id into v_owner from public.looks where id = new.look_id;

  if new.parent_id is null then
    perform public.trg_notifications_insert(
      v_owner, new.user_id, 'comment', 'look', new.look_id
    );
  else
    select user_id into v_parent_author
      from public.look_comments
     where id = new.parent_id;

    perform public.trg_notifications_insert(
      v_parent_author, new.user_id, 'reply', 'look', new.look_id
    );
  end if;

  return new;
end;
$$;

revoke all on function public.trg_notifications_look_comment() from public, anon;

drop trigger if exists trg_look_comments_notify on public.look_comments;
create trigger trg_look_comments_notify
  after insert on public.look_comments
  for each row execute procedure public.trg_notifications_look_comment();

-- Client-immutable columns: authenticated updates may only flip `read`.
create or replace function public.trg_notifications_protect_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.actor_id is distinct from old.actor_id
     or new.type is distinct from old.type
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Notifications can only be marked read.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.trg_notifications_protect_columns() from public, anon;

drop trigger if exists trg_notifications_protect_columns on public.notifications;
create trigger trg_notifications_protect_columns
  before update on public.notifications
  for each row execute procedure public.trg_notifications_protect_columns();
