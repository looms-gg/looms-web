-- Migration: 20260907140000_server_side_rate_limiting.sql
-- Description: Server-side rate limiting, account quotas, and storage safeguards to prevent bot flooding and resource exhaustion.

-- 1. Rate Limit Tracking Table
create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Enable RLS (internal table used only by security definer functions)
alter table public.rate_limit_events enable row level security;

-- Index for sliding-window lookups per user and action
create index if not exists idx_rate_limit_user_action_time
  on public.rate_limit_events (user_id, action, created_at desc);

-- Index for opportunistic pruning of stale events
create index if not exists idx_rate_limit_created_at
  on public.rate_limit_events (created_at);

-- 2. Core Server-Side Sliding Window Rate Limiter Function
create or replace function public.check_rate_limit(
  p_action text,
  p_max_events integer,
  p_window_seconds integer
)
returns void as $$
declare
  v_user_id uuid;
  v_count integer;
  v_window_start timestamptz;
  v_client_ip text;
begin
  v_user_id := auth.uid();
  -- If unauthenticated, cannot associate with user_id; allow or handle separately
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

  -- Attempt to capture IP from PostgREST headers if present
  begin
    v_client_ip := nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', '');
  exception when others then
    v_client_ip := null;
  end;

  -- Record this event
  insert into public.rate_limit_events (user_id, action, ip_address)
  values (v_user_id, p_action, v_client_ip);

  -- Opportunistic pruning (~2% probability) to keep table size bounded
  if random() < 0.02 then
    delete from public.rate_limit_events
     where created_at < now() - interval '24 hours';
  end if;
end;
$$ language plpgsql security definer;

-- 3. Account Quota Checker Function
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

-- 4. Triggers for Garment Creation (Rate Limit: 15 / 10m, Quota: 150)
create or replace function public.trg_garments_rate_limit_and_quota()
returns trigger as $$
begin
  -- Quota check (max 150 custom garments per account)
  perform public.check_user_quota('garments', 150);
  -- Sliding window rate limit (max 15 garments created per 10 minutes)
  perform public.check_rate_limit('garment_create', 15, 600);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_garments_rate_limit on public.garments;
create trigger trg_garments_rate_limit
  before insert on public.garments
  for each row execute procedure public.trg_garments_rate_limit_and_quota();

-- 5. Triggers for Look Saves (Rate Limit: 30 / 10m, Quota: 100)
create or replace function public.trg_looks_rate_limit_and_quota()
returns trigger as $$
begin
  -- Quota check (max 100 saved looks per account)
  perform public.check_user_quota('looks', 100);
  -- Sliding window rate limit (max 30 looks created/updated per 10 minutes)
  perform public.check_rate_limit('look_create', 30, 600);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_looks_rate_limit on public.looks;
create trigger trg_looks_rate_limit
  before insert on public.looks
  for each row execute procedure public.trg_looks_rate_limit_and_quota();

-- 6. Triggers for Profile Updates (Rate Limit: 10 / 5m)
create or replace function public.trg_profiles_rate_limit()
returns trigger as $$
begin
  perform public.check_rate_limit('profile_update', 10, 300);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_profiles_rate_limit on public.profiles;
create trigger trg_profiles_rate_limit
  before update on public.profiles
  for each row execute procedure public.trg_profiles_rate_limit();

-- 7. Storage Safeguards for Garment Textures Bucket
create or replace function public.trg_storage_garments_guard()
returns trigger as $$
declare
  v_size bigint;
begin
  if new.bucket_id = 'garments' then
    -- 1. Enforce 2MB server-side limit (2097152 bytes)
    if new.metadata is not null and (new.metadata->>'size') is not null then
      v_size := (new.metadata->>'size')::bigint;
      if v_size > 2097152 then
        raise exception 'File size exceeds server maximum of 2MB.'
          using errcode = 'P0001';
      end if;
    end if;

    -- 2. Enforce file extension (.png)
    if lower(right(new.name, 4)) != '.png' then
      raise exception 'Invalid file type: garment textures must be .png files.'
        using errcode = 'P0001';
    end if;

    -- 3. Rate limit uploads (max 15 texture uploads per 10 minutes)
    perform public.check_rate_limit('texture_upload', 15, 600);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_storage_garments_guard on storage.objects;
create trigger trg_storage_garments_guard
  before insert on storage.objects
  for each row execute procedure public.trg_storage_garments_guard();
