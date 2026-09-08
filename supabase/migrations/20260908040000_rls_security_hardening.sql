-- RLS / privilege hardening:
-- 1) Owner-scoped garments storage
-- 2) Private garment IDOR guards (wardrobe + comments)
-- 3) Protect immutable garment metrics
-- 4) Redact last_seen_at when show_last_seen is false
-- 5) Lock down SECURITY DEFINER execute + search_path
-- 6) Least-privilege grants (esp. rate_limit_events, TRUNCATE)

-- ---------------------------------------------------------------------------
-- 1. Garments storage: path must be {auth.uid()}/...
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can upload garment textures." on storage.objects;
drop policy if exists "Users upload own garment textures." on storage.objects;
drop policy if exists "Users update own garment textures." on storage.objects;
drop policy if exists "Users delete own garment textures." on storage.objects;

create policy "Users upload own garment textures."
  on storage.objects for insert
  with check (
    bucket_id = 'garments'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own garment textures."
  on storage.objects for update
  using (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own garment textures."
  on storage.objects for delete
  using (
    bucket_id = 'garments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Server-side bucket limits (defense in depth alongside triggers)
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png']
 where id = 'garments';

update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'profiles';

-- ---------------------------------------------------------------------------
-- 2. Private garment access guards
-- ---------------------------------------------------------------------------
drop policy if exists "Users can insert own wardrobe items." on public.wardrobe_items;
create policy "Users can insert own wardrobe items."
  on public.wardrobe_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
        from public.garments g
       where g.id = garment_id
         and (g.is_public = true or g.user_id = auth.uid())
    )
  );

-- Comments: enforce target garment visibility on INSERT and garment_id UPDATE
create or replace function public.trg_garment_comments_target_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

drop trigger if exists trg_garment_comments_target_guard on public.garment_comments;
create trigger trg_garment_comments_target_guard
  before insert or update of garment_id on public.garment_comments
  for each row execute function public.trg_garment_comments_target_guard();

-- Restore missing wardrobe saved_count decrement trigger
create or replace function public.trg_wardrobe_items_saved_count_del()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('looms.updating_saved_count', '1', true);
  update public.garments
     set saved_count = greatest(saved_count - 1, 0)
   where id = old.garment_id;
  return old;
end;
$$;

drop trigger if exists trg_wardrobe_items_saved_count_del on public.wardrobe_items;
create trigger trg_wardrobe_items_saved_count_del
  after delete on public.wardrobe_items
  for each row execute function public.trg_wardrobe_items_saved_count_del();

-- ---------------------------------------------------------------------------
-- 3. Protect gems / added from client UPDATEs (and force safe INSERT defaults)
-- ---------------------------------------------------------------------------
create or replace function public.trg_garments_protect_metrics()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.gems := coalesce(new.gems, 0);
    -- clients may set added; clamp to now-ish is unnecessary — block absurd self-boost on update only
    return new;
  end if;

  if new.gems is distinct from old.gems
     and current_setting('looms.updating_gems', true) is distinct from '1' then
    new.gems := old.gems;
  end if;

  if new.added is distinct from old.added
     and current_setting('looms.updating_added', true) is distinct from '1' then
    new.added := old.added;
  end if;

  if new.user_id is distinct from old.user_id then
    new.user_id := old.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garments_protect_metrics on public.garments;
create trigger trg_garments_protect_metrics
  before insert or update on public.garments
  for each row execute function public.trg_garments_protect_metrics();

-- Explicit WITH CHECK on ownership-sensitive UPDATEs
drop policy if exists "Users can update own garments." on public.garments;
create policy "Users can update own garments."
  on public.garments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile."
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 4. last_seen_at privacy: column revoke + redacting view
-- ---------------------------------------------------------------------------
revoke select (last_seen_at) on table public.profiles from anon, authenticated;
revoke update (last_seen_at, username_changed_at, id) on table public.profiles from anon, authenticated;

-- Owner view (not security_invoker): can read last_seen_at despite column revoke,
-- then redact unless show_last_seen or viewer is the subject. RLS on profiles is
-- already open for SELECT (public profiles); FORCE is not required here.
drop view if exists public.profiles_view;
create view public.profiles_view
with (security_invoker = false)
as
select
  p.id,
  p.username,
  p.minecraft_username,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.created_at,
  p.updated_at,
  p.show_last_seen,
  p.show_likes,
  p.username_changed_at,
  case
    when p.show_last_seen or p.id = auth.uid() then p.last_seen_at
    else null
  end as last_seen_at
from public.profiles p;

revoke all on public.profiles_view from public;
grant select on public.profiles_view to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Rewrite SECURITY DEFINER helpers with locked search_path
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_action text,
  p_max_events integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_count integer;
  v_window_start timestamptz;
  v_client_ip text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  v_window_start := now() - (p_window_seconds || ' seconds')::interval;

  select count(*)
    into v_count
    from public.rate_limit_events
   where user_id = v_user_id
     and action = p_action
     and created_at >= v_window_start;

  if v_count >= p_max_events then
    raise exception 'Rate limit exceeded for %: maximum % requests per % seconds. Please wait before trying again.',
      p_action, p_max_events, p_window_seconds
      using errcode = 'P0001';
  end if;

  begin
    v_client_ip := nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', '');
  exception when others then
    v_client_ip := null;
  end;

  insert into public.rate_limit_events (user_id, action, ip_address)
  values (v_user_id, p_action, v_client_ip);

  if random() < 0.02 then
    delete from public.rate_limit_events
     where created_at < now() - interval '24 hours';
  end if;
end;
$$;

create or replace function public.check_user_quota(p_table text, p_max_rows integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, username, minecraft_username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'minecraft_username'
  );
  return new;
end;
$$;

create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  update public.profiles
     set last_seen_at = now()
   where id = v_uid
     and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');
end;
$$;

create or replace function public.trg_garment_comments_rate_limit_and_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.check_user_quota('garment_comments', 2000);
  perform public.check_rate_limit('comment_create', 30, 600);
  return new;
end;
$$;

create or replace function public.trg_garment_comments_reply_depth()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
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
$$;

create or replace function public.trg_garment_comments_touch_updated()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.trg_garments_auto_wardrobe()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.wardrobe_items (user_id, garment_id)
  values (new.user_id, new.id)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.trg_garments_protect_like_count()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.like_count is distinct from old.like_count
     and current_setting('looms.updating_like_count', true) is distinct from '1' then
    new.like_count := old.like_count;
  end if;
  return new;
end;
$$;

create or replace function public.trg_garments_protect_saved_count()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.saved_count is distinct from old.saved_count
     and current_setting('looms.updating_saved_count', true) is distinct from '1' then
    new.saved_count := old.saved_count;
  end if;
  return new;
end;
$$;

create or replace function public.trg_garments_rate_limit_and_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.check_user_quota('garments', 150);
  perform public.check_rate_limit('garment_create', 15, 600);
  return new;
end;
$$;

create or replace function public.trg_likes_garment_count_del()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.target_type = 'garment' then
    perform set_config('looms.updating_like_count', '1', true);
    update public.garments
       set like_count = greatest(like_count - 1, 0)
     where id = old.target_id;
  end if;
  return old;
end;
$$;

create or replace function public.trg_likes_garment_count_ins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.target_type = 'garment' then
    perform set_config('looms.updating_like_count', '1', true);
    update public.garments
       set like_count = like_count + 1
     where id = new.target_id;
  end if;
  return new;
end;
$$;

create or replace function public.trg_likes_rate_limit_and_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.check_user_quota('likes', 5000);
  perform public.check_rate_limit('like_create', 60, 600);
  return new;
end;
$$;

create or replace function public.trg_looks_rate_limit_and_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.check_user_quota('looks', 100);
  perform public.check_rate_limit('look_create', 30, 600);
  return new;
end;
$$;

create or replace function public.trg_profiles_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.check_rate_limit('profile_update', 10, 300);
  return new;
end;
$$;

create or replace function public.trg_profiles_username_cooldown()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and old.username_changed_at > now() - interval '15 days' then
      raise exception 'Username can only be changed once every 15 days. Next change available after %.',
        (old.username_changed_at + interval '15 days')
        using errcode = 'P0001';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.trg_storage_garments_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_size bigint;
begin
  if new.bucket_id = 'garments' then
    if new.metadata is not null and (new.metadata->>'size') is not null then
      v_size := (new.metadata->>'size')::bigint;
      if v_size > 2097152 then
        raise exception 'File size exceeds server maximum of 2MB.'
          using errcode = 'P0001';
      end if;
    end if;

    if lower(right(new.name, 4)) != '.png' then
      raise exception 'Invalid file type: garment textures must be .png files.'
        using errcode = 'P0001';
    end if;

    perform public.check_rate_limit('texture_upload', 15, 600);
  end if;
  return new;
end;
$$;

create or replace function public.trg_storage_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_size bigint;
  v_ext text;
begin
  if new.bucket_id = 'profiles' then
    if new.metadata is not null and (new.metadata->>'size') is not null then
      v_size := (new.metadata->>'size')::bigint;
      if v_size > 2097152 then
        raise exception 'File size exceeds server maximum of 2MB.'
          using errcode = 'P0001';
      end if;
    end if;

    v_ext := lower(substring(new.name from '\.([^.]+)$'));
    if v_ext is null or v_ext not in ('png', 'jpg', 'jpeg', 'webp') then
      raise exception 'Invalid file type: profile images must be .png, .jpg, .jpeg, or .webp files.'
        using errcode = 'P0001';
    end if;

    perform public.check_rate_limit('profile_image_upload', 20, 600);
  end if;
  return new;
end;
$$;

create or replace function public.trg_wardrobe_items_rate_limit_and_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.check_user_quota('wardrobe_items', 500);
  perform public.check_rate_limit('wardrobe_add', 60, 600);
  return new;
end;
$$;

create or replace function public.trg_wardrobe_items_saved_count_ins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('looms.updating_saved_count', '1', true);
  update public.garments
     set saved_count = saved_count + 1
   where id = new.garment_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Least privilege: revoke RPC + dangerous grants
-- ---------------------------------------------------------------------------
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.check_user_quota(text, integer) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.trg_garment_comments_rate_limit_and_quota() from public, anon, authenticated;
revoke all on function public.trg_garment_comments_reply_depth() from public, anon, authenticated;
revoke all on function public.trg_garment_comments_target_guard() from public, anon, authenticated;
revoke all on function public.trg_garment_comments_touch_updated() from public, anon, authenticated;
revoke all on function public.trg_garments_auto_wardrobe() from public, anon, authenticated;
revoke all on function public.trg_garments_protect_like_count() from public, anon, authenticated;
revoke all on function public.trg_garments_protect_saved_count() from public, anon, authenticated;
revoke all on function public.trg_garments_protect_metrics() from public, anon, authenticated;
revoke all on function public.trg_garments_rate_limit_and_quota() from public, anon, authenticated;
revoke all on function public.trg_likes_garment_count_del() from public, anon, authenticated;
revoke all on function public.trg_likes_garment_count_ins() from public, anon, authenticated;
revoke all on function public.trg_likes_rate_limit_and_quota() from public, anon, authenticated;
revoke all on function public.trg_looks_rate_limit_and_quota() from public, anon, authenticated;
revoke all on function public.trg_profiles_rate_limit() from public, anon, authenticated;
revoke all on function public.trg_profiles_username_cooldown() from public, anon, authenticated;
revoke all on function public.trg_storage_garments_guard() from public, anon, authenticated;
revoke all on function public.trg_storage_profiles_guard() from public, anon, authenticated;
revoke all on function public.trg_wardrobe_items_rate_limit_and_quota() from public, anon, authenticated;
revoke all on function public.trg_wardrobe_items_saved_count_ins() from public, anon, authenticated;
revoke all on function public.trg_wardrobe_items_saved_count_del() from public, anon, authenticated;

-- Only intentional client RPC
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- rate_limit_events: clients must not touch this table at all
revoke all on table public.rate_limit_events from public, anon, authenticated;

-- Drop TRUNCATE (bypasses RLS) and other unused privileges on app tables
revoke truncate, references, trigger on table public.profiles from anon, authenticated;
revoke truncate, references, trigger on table public.garments from anon, authenticated;
revoke truncate, references, trigger on table public.looks from anon, authenticated;
revoke truncate, references, trigger on table public.likes from anon, authenticated;
revoke truncate, references, trigger on table public.wardrobe_items from anon, authenticated;
revoke truncate, references, trigger on table public.garment_comments from anon, authenticated;
