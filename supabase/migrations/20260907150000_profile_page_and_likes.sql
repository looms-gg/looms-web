-- Migration: 20260907150000_profile_page_and_likes.sql
-- Description: Profile banner/last-seen/username cooldown, public looks RLS, likes table, profiles storage.

-- 1. Profile columns
alter table public.profiles
  add column if not exists banner_url text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists show_last_seen boolean not null default true,
  add column if not exists username_changed_at timestamptz;

-- 2. Username cooldown (15 days); only when username actually changes
create or replace function public.trg_profiles_username_cooldown()
returns trigger as $$
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
$$ language plpgsql;

drop trigger if exists trg_profiles_username_cooldown on public.profiles;
create trigger trg_profiles_username_cooldown
  before update on public.profiles
  for each row execute procedure public.trg_profiles_username_cooldown();

-- 3. Last seen throttle RPC
create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public
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

grant execute on function public.touch_last_seen() to authenticated;

-- 4. Public looks readable by everyone; keep owner ALL
drop policy if exists "Users can manage their own looks." on public.looks;
create policy "Users can manage their own looks."
  on public.looks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public looks are viewable by everyone." on public.looks;
create policy "Public looks are viewable by everyone."
  on public.looks for select
  using (visibility = 'public');

-- 5. Likes table
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('garment', 'look')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists idx_likes_user_created
  on public.likes (user_id, created_at desc);
create index if not exists idx_likes_target
  on public.likes (target_type, target_id);

alter table public.likes enable row level security;

drop policy if exists "Likes are viewable by everyone." on public.likes;
create policy "Likes are viewable by everyone."
  on public.likes for select using (true);

drop policy if exists "Users can insert own likes." on public.likes;
create policy "Users can insert own likes."
  on public.likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own likes." on public.likes;
create policy "Users can delete own likes."
  on public.likes for delete
  using (auth.uid() = user_id);

-- 6. Extend quota helper for likes
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

create or replace function public.trg_likes_rate_limit_and_quota()
returns trigger as $$
begin
  perform public.check_user_quota('likes', 5000);
  perform public.check_rate_limit('like_create', 60, 600);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_likes_rate_limit on public.likes;
create trigger trg_likes_rate_limit
  before insert on public.likes
  for each row execute procedure public.trg_likes_rate_limit_and_quota();

-- 7. Profiles storage bucket
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

drop policy if exists "Profile images are publicly accessible." on storage.objects;
create policy "Profile images are publicly accessible."
  on storage.objects for select
  using (bucket_id = 'profiles');

drop policy if exists "Users upload own profile images." on storage.objects;
create policy "Users upload own profile images."
  on storage.objects for insert
  with check (
    bucket_id = 'profiles'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own profile images." on storage.objects;
create policy "Users update own profile images."
  on storage.objects for update
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own profile images." on storage.objects;
create policy "Users delete own profile images."
  on storage.objects for delete
  using (
    bucket_id = 'profiles'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.trg_storage_profiles_guard()
returns trigger as $$
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
$$ language plpgsql security definer;

drop trigger if exists trg_storage_profiles_guard on storage.objects;
create trigger trg_storage_profiles_guard
  before insert on storage.objects
  for each row execute procedure public.trg_storage_profiles_guard();
