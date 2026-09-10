-- Migration: 20260910100000_indexation_moderation_gates.sql
-- Description: Indexation quality gates — moderation_state on looks + garments
--   (public indexable / private / hidden), server-side triggers that hide
--   reported UGC automatically, and admin takedown RPCs with audit logging.
--
--   Client noindex meta is defensive depth only; the source of truth for what
--   may appear in the sitemap/prerender is these columns, enforced server-side.

-- 1. Moderation state column -------------------------------------------------
-- 'ok'        → normal (indexable when also public)
-- 'hidden'    → removed from public surfaces & sitemap; owner still sees it
-- 'dmca_down' → hidden AND owner notified via details; retraction restores 'ok'
alter table public.looks
  add column if not exists moderation_state text not null default 'ok';

alter table public.garments
  add column if not exists moderation_state text not null default 'ok';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'looks_moderation_state_check'
  ) then
    alter table public.looks
      add constraint looks_moderation_state_check
      check (moderation_state in ('ok', 'hidden', 'dmca_down'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'garments_moderation_state_check'
  ) then
    alter table public.garments
      add constraint garments_moderation_state_check
      check (moderation_state in ('ok', 'hidden', 'dmca_down'));
  end if;
end $$;

create index if not exists idx_looks_public_moderation
  on public.looks (visibility, moderation_state);

create index if not exists idx_garments_public_moderation
  on public.garments (is_public, moderation_state);

-- 2. Server-side takedown triggers: N pending reports auto-hide content ------
-- The gates must hold even if every admin is asleep: the worst a 50k-request
-- abuse run can achieve is hiding content faster, never exposing private rows.

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

-- 3. Public surfaces & build-time feeds exclude hidden content ---------------

create or replace function public.get_trending_looks_past_day(
  p_limit integer default 3
)
returns table (
  id uuid,
  user_id uuid,
  name text,
  description text,
  visibility text,
  stack text[],
  body_id text,
  body_hue integer,
  model text,
  like_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  recent_like_count bigint,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  with
    likes_1h as (
      select target_id, count(*)::bigint as cnt
      from public.likes
      where target_type = 'look'
        and created_at >= now() - interval '1 hour'
      group by target_id
    ),
    likes_6h as (
      select target_id, count(*)::bigint as cnt
      from public.likes
      where target_type = 'look'
        and created_at >= now() - interval '6 hours'
      group by target_id
    ),
    likes_24h as (
      select target_id, count(*)::bigint as cnt
      from public.likes
      where target_type = 'look'
        and created_at >= now() - interval '24 hours'
      group by target_id
    )
  select
    l.id,
    l.user_id,
    l.name,
    l.description,
    l.visibility,
    l.stack,
    l.body_id,
    l.body_hue,
    l.model,
    l.like_count,
    l.created_at,
    l.updated_at,
    coalesce(likes_24h.cnt, 0)                         as recent_like_count,
    p.username,
    p.avatar_url
  from public.looks l
  join public.profiles p on p.id = l.user_id
  left join likes_1h  on likes_1h.target_id  = l.id::text
  left join likes_6h  on likes_6h.target_id  = l.id::text
  left join likes_24h on likes_24h.target_id = l.id::text
  where l.visibility = 'public'
    and l.moderation_state = 'ok'
  order by
    (coalesce(likes_1h.cnt,  0) * 3.0
   + coalesce(likes_6h.cnt,  0) * 1.5
   + coalesce(likes_24h.cnt, 0) * 1.0) desc,
    l.like_count desc,
    l.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_trending_looks_past_day(integer) to anon, authenticated;

create or replace function public.get_yesterday_top_look()
returns table (
  id uuid,
  user_id uuid,
  name text,
  description text,
  visibility text,
  stack text[],
  body_id text,
  body_hue integer,
  model text,
  like_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  recent_like_count bigint,
  username text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.user_id,
    l.name,
    l.description,
    l.visibility,
    l.stack,
    l.body_id,
    l.body_hue,
    l.model,
    l.like_count,
    l.created_at,
    l.updated_at,
    yesterday.cnt as recent_like_count,
    p.username,
    p.avatar_url
  from (
    select target_id, count(*)::bigint as cnt
    from public.likes
    where target_type = 'look'
      and created_at >= now() - interval '48 hours'
      and created_at <  now() - interval '24 hours'
    group by target_id
    order by cnt desc
    limit 1
  ) yesterday
  join public.looks l    on l.id::text = yesterday.target_id
  join public.profiles p on p.id = l.user_id
  where l.visibility = 'public'
    and l.moderation_state = 'ok';
$$;

grant execute on function public.get_yesterday_top_look() to anon, authenticated;

-- 4. Public feeds used by the SPA + build scripts also gate on moderation ----
-- Hidden garments drop out of the anon catalog (owners unaffected: their own
-- rows pass the user_id clause regardless of moderation_state).

drop policy if exists "Public garments are viewable by everyone; private garments by owner." on public.garments;
create policy "Public garments are viewable by everyone; private garments by owner."
  on public.garments for select
  using (
    (is_public = true and moderation_state = 'ok')
    or auth.uid() = user_id
  );

drop policy if exists "Public looks are viewable by everyone." on public.looks;
create policy "Public looks are viewable by everyone."
  on public.looks for select
  using (
    (visibility = 'public' and moderation_state = 'ok')
    or auth.uid() = user_id
  );

-- 5. Admin takedown / restore RPCs with audit logging -------------------------
-- Client calls (src/lib/reports.ts adminDeleteContent) stay available, but the
-- canonical moderation path is now: hide (noindex) → review → delete or restore.

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
