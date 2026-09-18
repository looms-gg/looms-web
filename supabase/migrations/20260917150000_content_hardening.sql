-- Migration: 20260917150000_content_hardening.sql
-- Description: Closes client-trusted gaps found in the look upload → view trace:
--   1) Server-side size limits on looks (name, description, stack, body_hue) —
--      client clamping is UX only; hand-crafted PostgREST writes previously
--      accepted multi-MB text and unbounded stack arrays that every feed
--      viewer then downloaded.
--   2) Timestamps become server-authoritative (looks.created_at/updated_at,
--      garments.added/created_at on insert) so feed ordering and the trending
--      age-decay score can no longer be steered with backdated or future rows.
--   3) Rate limit on looks UPDATE (the insert trigger alone left save-over and
--      meta edits unlimited).
--   4) texture_url shape guard, mirroring the thumb_url guard: a hand-crafted
--      request can no longer point a public piece's texture at an arbitrary
--      external host (tracking pixels, oversized files, hotlinked art).
--   5) Likes validate their target exists and is publicly visible before the
--      like lands, so junk rows and private-look like_count inflation die.
--   6) Repair trg_notifications_like (20260913000000): uuid-vs-text comparison
--      that fails every like on a look with "operator does not exist".
--
--   Data clamps run before constraints, and only touch rows a real client
--   could not have produced through the app. Rollback: drop the new
--   constraints/triggers; clamped data stays clamped.

-- ---------------------------------------------------------------------------
-- 1. Clamp legacy rows that exceed the limits the client already enforces.
--    Values match MAX_LIMITS in src/lib/sanitize.ts; stack cap is 16 entries
--    (9 slots + headroom for renamed/legacy catalog ids).
-- ---------------------------------------------------------------------------

update public.looks
   set name = coalesce(nullif(btrim(left(name, 50)), ''), 'Untitled look'),
       description = left(description, 500),
       body_hue = greatest(-120, least(120, body_hue)),
       stack = coalesce((
         select array_agg(x order by ord)
           from (select x, ord from unnest(stack) with ordinality as t(x, ord) limit 16) s
       ), '{}')
 where char_length(btrim(name)) = 0
    or char_length(name) > 50
    or char_length(description) > 500
    or body_hue not between -120 and 120
    or cardinality(stack) > 16;

-- ---------------------------------------------------------------------------
-- 2. Constraints: the database is now the boundary for these fields.
-- ---------------------------------------------------------------------------

alter table public.looks
  drop constraint if exists looks_name_len,
  drop constraint if exists looks_description_len,
  drop constraint if exists looks_stack_cardinality,
  drop constraint if exists looks_body_hue_range;

alter table public.looks
  add constraint looks_name_len
    check (char_length(btrim(name)) between 1 and 50),
  add constraint looks_description_len
    check (char_length(description) <= 500),
  add constraint looks_stack_cardinality
    check (cardinality(stack) <= 16),
  add constraint looks_body_hue_range
    check (body_hue between -120 and 120);

-- ---------------------------------------------------------------------------
-- 3. Looks: server-authoritative timestamps + rate-limited updates.
--    Like-count triggers and moderation/admin helpers mark their writes with
--    set_config flags; those system writes skip both the updated_at bump and
--    the rate limit so a like never consumes the liker's update budget and a
--    pending-report auto-hide can never fail on a rate-limit exception.
-- ---------------------------------------------------------------------------

create or replace function public.trg_looks_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  new.created_at := old.created_at;

  -- A thumb-only re-bake (look thumbnails, mirroring garment thumbs) writes
  -- just thumb_url (plus updated_at); it rides along with saves and must not
  -- burn the user's update budget or rewrite updated_at.
  if tg_op = 'UPDATE'
     and new.name is not distinct from old.name
     and new.description is not distinct from old.description
     and new.stack is not distinct from old.stack
     and new.body_id is not distinct from old.body_id
     and new.body_hue is not distinct from old.body_hue
     and new.model is not distinct from old.model
     and new.visibility is not distinct from old.visibility
     and new.like_count is not distinct from old.like_count
     and new.moderation_state is not distinct from old.moderation_state
     and new.user_id is not distinct from old.user_id
     and new.created_at is not distinct from old.created_at then
    return new;
  end if;

  if current_setting('looms.system_update', true) is distinct from '1'
     and current_setting('looms.updating_like_count', true) is distinct from '1' then
    perform public.check_rate_limit('look_update', 30, 600);
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_looks_columns_guard on public.looks;
create trigger trg_looks_columns_guard
  before insert or update on public.looks
  for each row execute function public.trg_looks_guard_columns();

-- System-driven look writes: moderation helpers keep timestamps intact and
-- bypass the per-user update rate limit (auth.uid() inside them belongs to
-- the reporter or the admin, not the row owner).
create or replace function public.trg_reports_auto_hide_target()
returns trigger as $$
declare
  v_pending integer;
  v_threshold integer := 3;
begin
  select count(*) into v_pending
    from public.content_reports
   where target_type = new.target_type
     and target_id = new.target_id
     and status = 'pending';

  if v_pending >= v_threshold then
    perform set_config('looms.system_update', '1', true);
    if new.target_type = 'look' then
      update public.looks
         set moderation_state = 'hidden'
       where id::text = new.target_id
         and moderation_state = 'ok';
    elsif new.target_type = 'piece' then
      update public.garments
         set moderation_state = 'hidden'
       where id::text = new.target_id
         and moderation_state = 'ok';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_content_reports_auto_hide on public.content_reports;
create trigger trg_content_reports_auto_hide
  after insert on public.content_reports
  for each row
  execute function public.trg_reports_auto_hide_target();

create or replace function public.admin_set_moderation_state(
  p_target_type text,
  p_target_id text,
  p_state text,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_set_moderation_state: caller is not an admin'
      using errcode = '42501';
  end if;

  if p_state not in ('ok', 'hidden', 'dmca_down') then
    raise exception 'admin_set_moderation_state: invalid state %', p_state
      using errcode = '22023';
  end if;

  perform set_config('looms.system_update', '1', true);

  if p_target_type = 'look' then
    update public.looks set moderation_state = p_state where id::text = p_target_id;
  elsif p_target_type = 'piece' then
    update public.garments set moderation_state = p_state where id::text = p_target_id;
  else
    raise exception 'admin_set_moderation_state: unsupported target %', p_target_type
      using errcode = '22023';
  end if;

  perform public.log_admin_action(
    'moderation_state_' || p_state,
    p_target_type,
    p_target_id,
    p_details
  );
end;
$$;

revoke all on function public.admin_set_moderation_state(text, text, text, jsonb) from public;
revoke all on function public.admin_set_moderation_state(text, text, text, jsonb) from anon;
grant execute on function public.admin_set_moderation_state(text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Garments: timestamps on insert, created_at frozen on update, and the
--    texture_url shape guard. The expected host is the project's Supabase
--    URL (public info), hardcoded because Postgres cannot read browser env.
-- ---------------------------------------------------------------------------

create or replace function public.trg_garments_guard_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.added := (extract(epoch from now()) * 1000)::bigint;
    new.created_at := now();
    return new;
  end if;

  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_garments_columns_guard on public.garments;
create trigger trg_garments_columns_guard
  before insert or update on public.garments
  for each row execute function public.trg_garments_guard_columns();

create or replace function public.enforce_garment_texture_url()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected text;
begin
  v_expected := 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
    || new.user_id || '/' || new.id || '.png';

  if new.texture_url <> v_expected
     and left(new.texture_url, length(v_expected) + 1) <> v_expected || '?' then
    raise exception 'Invalid texture URL: it must point at this piece''s own texture in your storage folder. Re-publish the piece to fix it.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_garments_enforce_texture_url on public.garments;
create trigger trg_garments_enforce_texture_url
  before insert or update on public.garments
  for each row execute function public.enforce_garment_texture_url();

-- One-time repair: force any hand-crafted texture_url back to the canonical
-- object path for its own row. Only rows a real client could not have written
-- are touched (cache-busted ?v= URLs keep their buster). Changing texture_url
-- also nulls thumb_url via trg_garments_enforce_thumb_url so stale baked art
-- never outlives the swap.
update public.garments
   set texture_url = 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
     || user_id || '/' || id || '.png'
 where texture_url <> 'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
     || user_id || '/' || id || '.png'
   and left(texture_url, length('https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
     || user_id || '/' || id || '.png') + 1) <>
     'https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/'
     || user_id || '/' || id || '.png' || '?';

-- ---------------------------------------------------------------------------
-- 5. Likes: the target must exist and be publicly visible (or be the liker's
--    own row). Kills junk likes rows and like_count inflation on private
--    content; owner-likes on their own unlisted content stay allowed.
-- ---------------------------------------------------------------------------

create or replace function public.trg_likes_validate_target()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ok boolean;
begin
  if new.target_type = 'look' then
    select exists (
             select 1 from public.looks
              where id::text = new.target_id
                and visibility = 'public'
                and moderation_state = 'ok'
           )
        or exists (
             select 1 from public.looks
              where id::text = new.target_id
                and user_id = auth.uid()
           )
      into v_ok;
  elsif new.target_type = 'garment' then
    select exists (
             select 1 from public.garments
              where id = new.target_id
                and is_public = true
                and moderation_state = 'ok'
           )
        or exists (
             select 1 from public.garments
              where id = new.target_id
                and user_id = auth.uid()
           )
      into v_ok;
  else
    v_ok := false;
  end if;

  if not v_ok then
    raise exception 'That content no longer exists or is not shareable.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_likes_target_guard on public.likes;
create trigger trg_likes_target_guard
  before insert on public.likes
  for each row execute function public.trg_likes_validate_target();

-- ---------------------------------------------------------------------------
-- 6. Repair: trg_notifications_like (20260913000000) compares looks.id (uuid)
--    against likes.target_id (text), which raises "operator does not exist:
--    uuid = text" and fails every like on a look. Recreate with the cast the
--    like-count triggers already use; the trigger definition is unchanged.
-- ---------------------------------------------------------------------------

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
    select user_id into v_owner from public.looks where id::text = new.target_id;
  end if;

  perform public.trg_notifications_insert(
    v_owner, new.user_id, 'like', new.target_type, new.target_id
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Least privilege: trigger helpers are never callable by sessions.
-- ---------------------------------------------------------------------------

revoke all on function public.trg_looks_guard_columns() from public, anon, authenticated;
revoke all on function public.trg_garments_guard_columns() from public, anon, authenticated;
revoke all on function public.enforce_garment_texture_url() from public, anon, authenticated;
revoke all on function public.trg_likes_validate_target() from public, anon, authenticated;
revoke all on function public.trg_reports_auto_hide_target() from public, anon, authenticated;
