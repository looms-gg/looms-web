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
select plan(9);

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
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'alice@test.dev', 'x', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'bob@test.dev',   'x', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (id, username) values
  ('11111111-1111-1111-1111-111111111111', 'alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob');

-- 1. A user cannot update another user's profile (RLS ownership).
select tests.authenticate('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111' and username = 'alice'),
  1,
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

-- 4. check_rate_limit trips after the configured max.
select tests.authenticate('11111111-1111-1111-1111-111111111111');
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

select * from finish();
rollback;
