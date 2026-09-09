-- Migration: 20260909050000_smarter_trending.sql
-- Description: Replace flat recent_like_count ordering in get_trending_looks_past_day
--   with a velocity-aware decay score (1h x3 + 6h x1.5 + 24h x1.0).
--   Add get_yesterday_top_look RPC (likes in the 48h->24h window).

-- 1. Upgrade get_trending_looks_past_day with velocity decay
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
  order by
    (coalesce(likes_1h.cnt,  0) * 3.0
   + coalesce(likes_6h.cnt,  0) * 1.5
   + coalesce(likes_24h.cnt, 0) * 1.0) desc,
    l.like_count desc,
    l.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_trending_looks_past_day(integer) to anon, authenticated;

-- 2. Add get_yesterday_top_look RPC
--    Returns the single look with the most likes in the 48h->24h window.
--    Returns zero rows when no look received any likes in that window.
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
  where l.visibility = 'public';
$$;

grant execute on function public.get_yesterday_top_look() to anon, authenticated;
