-- Migration: 20260913120000_oauth_onboarding_connections.sql
-- Description: OAuth onboarding flag, connections table synced from auth.identities,
-- and SECURITY DEFINER RPCs for completing onboarding, unlinking, and featuring.
--
-- Manual verification checklist (no pgTAP in this repo; run after deploy):
--   1. Link a Discord identity via dashboard -> profile_connections row appears.
--   2. Delete the identity -> row disappears.
--   3. As anon: select from profile_connections returns only featured rows.
--   4. As owner: insert/update/delete directly -> permission denied (no write policies).
--   5. set_connection_featured('google', true) -> error "Only Discord can be featured".
--   6. Sole OAuth identity, no password: unlink_connection -> error "Keep at least one way to sign in".
--   7. complete_onboarding twice with same name -> second call is a no-op (idempotent).

-- 1. Onboarding flag -----------------------------------------------------------------

alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false;

-- Existing users already chose usernames; they are onboarded.
update public.profiles set onboarding_complete = true where onboarding_complete = false;

-- 2. Username sanitizer (server twin of sanitizeUsername in src/lib/sanitize.ts) -----

create or replace function public.sanitize_looms_username(p_input text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v text;
begin
  if p_input is null then
    return null;
  end if;
  v := regexp_replace(p_input, '<[^>]*>', '', 'g');
  v := substring(v from 1 for 30);
  v := regexp_replace(v, '[^a-zA-Z0-9_-]', '', 'g');
  return nullif(v, '');
end;
$$;

-- 3. Connections table ---------------------------------------------------------------

create table if not exists public.profile_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('discord', 'google', 'azure')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.profile_connections enable row level security;

-- World sees featured rows only; owners see their own. Google/Microsoft rows are
-- owner-only by construction because they can never be featured (enforced in the RPC).
create policy "Featured connections are viewable by everyone."
  on public.profile_connections for select
  using (featured = true or auth.uid() = user_id);

-- No insert/update/delete policies: client writes are denied by default. Writes go
-- through the identity-sync triggers and the RPCs below, which also keep user_id and
-- featured client-immutable.

-- 4. Backfill from existing identities ----------------------------------------------

insert into public.profile_connections (user_id, provider)
select user_id, provider
  from auth.identities
 where provider in ('discord', 'google', 'azure')
on conflict (user_id, provider) do nothing;

-- 5. Identity sync triggers ----------------------------------------------------------

create or replace function public.trg_identities_link_connection()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.provider in ('discord', 'google', 'azure') then
    insert into public.profile_connections (user_id, provider)
    values (new.user_id, new.provider)
    on conflict (user_id, provider) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.trg_identities_unlink_connection()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.profile_connections
   where user_id = old.user_id
     and provider = old.provider;
  return old;
end;
$$;

drop trigger if exists trg_on_identity_linked on auth.identities;
create trigger trg_on_identity_linked
  after insert on auth.identities
  for each row execute function public.trg_identities_link_connection();

drop trigger if exists trg_on_identity_unlinked on auth.identities;
create trigger trg_on_identity_unlinked
  after delete on auth.identities
  for each row execute function public.trg_identities_unlink_connection();

-- 6. Onboarding completion RPC -------------------------------------------------------

create or replace function public.complete_onboarding(p_username text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_clean text;
begin
  if v_uid is null then
    raise exception 'You need to be signed in to finish setting up your account.'
      using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('onboarding_complete', 10, 600);

  v_clean := public.sanitize_looms_username(p_username);
  if v_clean is null then
    raise exception 'Please choose a display username.' using errcode = 'P0001';
  end if;

  perform set_config('looms.onboarding_set', '1', true);

  begin
    update public.profiles
       set username = v_clean,
           onboarding_complete = true
     where id = v_uid
       and onboarding_complete = false;
  exception when unique_violation then
    raise exception 'That username is taken. Try another.' using errcode = 'P0001';
  end;
end;
$$;

revoke all on function public.complete_onboarding(text) from public, anon;
grant execute on function public.complete_onboarding(text) to authenticated;

-- 7. Unlink RPC with last-login-method guard ----------------------------------------

create or replace function public.unlink_connection(p_provider text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_identity_count integer;
  v_has_password boolean;
begin
  if v_uid is null then
    raise exception 'You need to be signed in to manage connections.'
      using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('unlink_connection', 10, 600);

  if p_provider not in ('discord', 'google', 'azure') then
    raise exception 'Unknown connection.' using errcode = 'P0001';
  end if;

  select count(*) into v_identity_count
    from auth.identities
   where user_id = v_uid;

  select encrypted_password <> '' into v_has_password
    from auth.users
   where id = v_uid;

  if v_identity_count <= 1 and not v_has_password then
    raise exception 'Keep at least one way to sign in. Add a password before removing this.'
      using errcode = 'P0001';
  end if;

  delete from auth.identities
   where user_id = v_uid
     and provider = p_provider;
end;
$$;

revoke all on function public.unlink_connection(text) from public, anon;
grant execute on function public.unlink_connection(text) to authenticated;

-- 8. Feature toggle RPC (Discord only) ----------------------------------------------

create or replace function public.set_connection_featured(p_provider text, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You need to be signed in to manage connections.'
      using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('connection_featured', 20, 600);

  if p_provider <> 'discord' then
    raise exception 'Only Discord can be featured on profiles right now.'
      using errcode = 'P0001';
  end if;

  update public.profile_connections
     set featured = p_featured
   where user_id = v_uid
     and provider = p_provider;
end;
$$;

revoke all on function public.set_connection_featured(text, boolean) from public, anon;
grant execute on function public.set_connection_featured(text, boolean) to authenticated;

-- 9. Cooldown trigger: first username set during onboarding bypasses the 15-day lock.
--    Same set_config flag pattern as the counter guards.

create or replace function public.trg_profiles_username_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.username is distinct from old.username then
    if coalesce(current_setting('looms.onboarding_set', true), '') = '1' then
      return new;
    end if;
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

-- 10. handle_new_user: OAuth metadata username chain, no Minecraft seeding,
--     onboarding complete only when the email path already collected a username.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meta jsonb := new.raw_user_meta_data;
  v_username text;
begin
  v_username := coalesce(
    nullif(v_meta->>'username', ''),
    nullif(v_meta->>'global_name', ''),
    nullif(v_meta->>'user_name', ''),
    nullif(v_meta->>'name', ''),
    nullif(v_meta->>'preferred_username', ''),
    nullif(v_meta->>'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_username := coalesce(public.sanitize_looms_username(v_username), 'user');

  insert into public.profiles (id, username, onboarding_complete)
  values (
    new.id,
    v_username,
    coalesce(new.app_metadata->>'provider', 'email') = 'email'
      and nullif(v_meta->>'username', '') is not null
  );
  return new;
end;
$$;
