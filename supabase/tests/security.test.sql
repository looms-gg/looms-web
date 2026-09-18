-- Security-boundary tests (pgTAP) — run via `supabase test db`.
--
-- These assert that the Postgres enforcement layer holds independently of any
-- client: RLS scopes rows to the caller, rate limits trip server-side, and
-- counter/ownership columns cannot be forged by a hand-crafted request.
-- The human runs this harness locally (it needs `supabase start`, which boots
-- Postgres + pgTAP via Docker); it is not wired into CI by an agent.
--
-- Usage:
--   supabase start
--   supabase test db

begin;

create schema if not exists tests;
grant usage on schema tests to authenticated;

-- The pgTAP functions may not exist on a freshly booted local stack.
create extension if not exists pgtap;

select plan(19);

-- Impersonation helper: switches to the authenticated role and points
-- auth.uid() at the given user for the rest of the transaction.
create or replace function tests.authenticate(user_id uuid)
returns void
language plpgsql
as $$
begin
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true
  );
end;
$$;

-- Two real auth users (minimal columns; rest fall back to schema defaults).
-- session_replication_role = replica skips the on-signup trigger and the auth
-- FKs so these fixtures and the profiles inserted below stay deterministic.
-- The trigger is covered by 20260917160000_fix_handle_new_user_app_metadata.sql;
-- do not treat a trigger error here as harmless schema drift.
set local session_replication_role = replica;
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'alice@test.dev', 'x', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'bob@test.dev',   'x', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
set local session_replication_role = origin;

insert into public.profiles (id, username) values
  ('11111111-1111-1111-1111-111111111111', 'alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob');

-- 1. A user cannot update another user's profile (RLS ownership).
select tests.authenticate('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111' and username = 'alice'),
  1::bigint,
  'bob cannot change alice''s username (no matching row visible/updated)'
);
update public.profiles set username = 'pwned' where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select username from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'alice',
  'cross-user profile update is a no-op'
);

-- 2. A user cannot insert a profile row under someone else's id.
select tests.authenticate('22222222-2222-2222-2222-222222222222');
select throws_ok(
  $$ insert into public.profiles (id, username) values ('33333333-3333-3333-3333-333333333333', 'carol') $$,
  '42501',
  null,
  'inserting a profile for another id is rejected by WITH CHECK'
);

-- 3. rate_limit_events is not writable by authenticated clients.
select tests.authenticate('11111111-1111-1111-1111-111111111111');
select throws_ok(
  $$ insert into public.rate_limit_events (user_id, action) values ('11111111-1111-1111-1111-111111111111', 'x') $$,
  '42501',
  null,
  'authenticated clients cannot write the rate-limit ledger directly'
);

-- 4. check_rate_limit trips after the configured max. The function is
--    invoked server-side by SECURITY DEFINER triggers, so exec is revoked
--    from authenticated clients — de-impersonate for the logic assertions.
reset role;
select lives_ok(
  $$ select public.check_rate_limit('security_test_action', 3, 60) $$,
  'first rate-limit event passes'
);
select lives_ok(
  $$ select public.check_rate_limit('security_test_action', 3, 60) $$,
  'second rate-limit event passes'
);
select lives_ok(
  $$ select public.check_rate_limit('security_test_action', 3, 60) $$,
  'third rate-limit event passes'
);
select throws_ok(
  $$ select public.check_rate_limit('security_test_action', 3, 60) $$,
  'P0001',
  null,
  'fourth event trips the sliding-window limit'
);

-- 5. is_admin is false for a normal user, and the admin RPC rejects them.
select tests.authenticate('11111111-1111-1111-1111-111111111111');
select is(
  public.is_admin(),
  false,
  'a non-admin user is not an admin'
);
select throws_ok(
  $$ select public.admin_set_moderation_state('look', '00000000-0000-0000-0000-000000000000', 'hidden') $$,
  '42501',
  null,
  'admin moderation RPC rejects non-admins'
);

-- 6. garments.thumb_url must point at the owner's own pre-baked file in the
--    garments bucket (hand-crafted URLs are rejected by the BEFORE trigger).
select tests.authenticate('11111111-1111-1111-1111-111111111111');

select lives_ok(
  $$ insert into public.garments (id, user_id, name, slot, texture_url, thumb_url)
     values (
       '44444444-4444-4444-4444-444444444444',
       '11111111-1111-1111-1111-111111111111',
       'jacket', 'coat', 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/44444444-4444-4444-4444-444444444444.png',
       'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/44444444-4444-4444-4444-444444444444.thumb.png'
     ) $$,
  'valid own-folder thumb_url is accepted'
);

select throws_ok(
  $$ insert into public.garments (id, user_id, name, slot, texture_url, thumb_url)
     values (
       '55555555-5555-5555-5555-555555555555',
       '11111111-1111-1111-1111-111111111111',
       'jacket', 'coat', 'x.png',
       'https://evil.example/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/55555555-5555-5555-5555-555555555555.thumb.png'
     ) $$,
  'P0001',
  null,
  'thumb_url on a different host is rejected'
);

select throws_ok(
  $$ insert into public.garments (id, user_id, name, slot, texture_url, thumb_url)
     values (
       '66666666-6666-6666-6666-666666666666',
       '11111111-1111-1111-1111-111111111111',
       'jacket', 'coat', 'x.png',
       'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/22222222-2222-2222-2222-222222222222/66666666-6666-6666-6666-666666666666.thumb.png'
     ) $$,
  'P0001',
  null,
  'thumb_url pointing at another user''s folder is rejected'
);

select throws_ok(
  $$ insert into public.garments (id, user_id, name, slot, texture_url, thumb_url)
     values (
       '77777777-7777-7777-7777-777777777777',
       '11111111-1111-1111-1111-111111111111',
       'jacket', 'coat', 'x.png',
       'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.thumb.png'
     ) $$,
  'P0001',
  null,
  'thumb_url naming another user''s piece id under the owner''s folder is rejected'
);

select lives_ok(
  $$ insert into public.garments (id, user_id, name, slot, texture_url, thumb_url)
     values (
       '88888888-8888-8888-8888-888888888888',
       '11111111-1111-1111-1111-111111111111',
       'hat', 'hat', 'x.png',
       'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/88888888-8888-8888-8888-888888888888.thumb.png?v=1726543210000'
     ) $$,
  'thumb_url with a ?v= cache-buster is accepted'
);

select lives_ok(
  $$ update public.garments set texture_url = 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/44444444-4444-4444-4444-444444444444-v2.png'
     where id = '44444444-4444-4444-4444-444444444444' $$,
  'texture update is allowed'
);
select is(
  (select thumb_url from public.garments where id = '44444444-4444-4444-4444-444444444444'),
  null::text,
  'a texture change nulls the stale baked thumbnail'
);

select lives_ok(
  $$ update public.garments set texture_url = 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/11111111-1111-1111-1111-111111111111/44444444-4444-4444-4444-444444444444-v3.png'
     where id = '44444444-4444-4444-4444-444444444444' $$,
  'texture update with a null thumb_url is still allowed'
);
select is(
  (select thumb_url from public.garments where id = '44444444-4444-4444-4444-444444444444'),
  null::text,
  'thumb_url stays null across a texture change when it was already null'
);

select * from finish();
rollback;
