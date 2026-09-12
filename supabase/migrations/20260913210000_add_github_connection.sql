-- Migration: 20260913210000_add_github_connection.sql
-- Description: Adds GitHub to the OAuth connection set. GitHub is a private
-- connection like Google: it can sign in but never be featured on profiles.

-- 1. Provider check -----------------------------------------------------------------

alter table public.profile_connections
  drop constraint if exists profile_connections_provider_check;

alter table public.profile_connections
  add constraint profile_connections_provider_check
  check (provider in ('discord', 'google', 'github'));

-- 2. RPC ----------------------------------------------------------------------------

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

  if p_provider not in ('discord', 'google', 'github') then
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

-- 3. Identity sync trigger ----------------------------------------------------------

create or replace function public.trg_identities_link_connection()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.provider in ('discord', 'google', 'github') then
    insert into public.profile_connections (user_id, provider)
    values (new.user_id, new.provider)
    on conflict (user_id, provider) do nothing;
  end if;
  return new;
end;
$$;

-- 4. Backfill -----------------------------------------------------------------------

insert into public.profile_connections (user_id, provider)
select user_id, provider
  from auth.identities
 where provider = 'github'
on conflict (user_id, provider) do nothing;
