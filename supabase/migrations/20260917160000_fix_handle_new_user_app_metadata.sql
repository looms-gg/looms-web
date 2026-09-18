-- Migration: 20260917160000_fix_handle_new_user_app_metadata.sql
-- Description: Fix on-signup profile provisioning. handle_new_user() read
-- new.app_metadata, but auth.users has no such column; app metadata lives in
-- raw_app_meta_data. Every auth.users insert raised 42703 inside the trigger,
-- so GoTrue returned "Database error saving new user" and no account could be
-- created. This replaces the function with the correct column.
--
-- Manual verification checklist (no pgTAP in this repo; run after deploy):
--   1. Insert a fresh auth.users row (email/provider) -> a profiles row appears.
--   2. Repeat for an OAuth-style raw_app_meta_data provider -> same result.
--   3. A signup with no metadata username falls back to the sanitized email
--      local part.

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
    coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email'
      and nullif(v_meta->>'username', '') is not null
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
