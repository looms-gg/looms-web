-- Migration: 20260908070000_admin_and_reports.sql
-- Description: Admin authorization, content reports moderation system, admin RLS policies, and site announcement banners.

-- ---------------------------------------------------------------------------
-- 1. Admin Users Table and is_admin() Function
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Seed the initial admin user
insert into public.admin_users (user_id)
values ('45e6be54-c9a5-4627-af39-9c14b27ec92e'::uuid)
on conflict (user_id) do nothing;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean as $$
begin
  if p_user_id is null then
    return false;
  end if;
  return exists (
    select 1
    from public.admin_users
    where user_id = p_user_id
  );
end;
$$ language plpgsql security definer stable set search_path = public;

-- Only admins can select from admin_users
create policy "Admins can view admin users."
  on public.admin_users for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Content Reports Table & Abuse Guards
-- ---------------------------------------------------------------------------
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('look', 'piece', 'comment', 'profile')),
  target_id text not null,
  target_sub_type text,
  target_label text,
  reason text not null,
  details text check (char_length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  action_taken text default 'none',
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

create index if not exists idx_content_reports_status_created
  on public.content_reports (status, created_at desc);

create index if not exists idx_content_reports_target
  on public.content_reports (target_type, target_id);

create index if not exists idx_content_reports_reporter
  on public.content_reports (reporter_id, created_at desc);

-- Trigger function for content report rate limiting and pending quota
create or replace function public.check_content_report_limits()
returns trigger as $$
declare
  v_pending_count integer;
begin
  -- 1. Sliding window rate limit: max 10 reports per 10 minutes (600s)
  perform public.check_rate_limit('content_report', 10, 600);

  -- 2. Active pending report quota: max 25 pending reports per user
  select count(*)
    into v_pending_count
    from public.content_reports
   where reporter_id = new.reporter_id
     and status = 'pending';

  if v_pending_count >= 25 then
    raise exception 'Report quota exceeded: you have too many pending reports under review. Please wait for them to be processed.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_content_report_limits on public.content_reports;
create trigger trg_content_report_limits
  before insert on public.content_reports
  for each row
  execute function public.check_content_report_limits();

-- Content Reports RLS:
-- Users can insert their own reports
create policy "Users can submit reports."
  on public.content_reports for insert
  with check (auth.uid() = reporter_id);

-- Reporters can view their own reports; admins can view all reports
create policy "Reporters or admins can view reports."
  on public.content_reports for select
  using (auth.uid() = reporter_id or public.is_admin());

-- Only admins can update report status or resolve them
create policy "Admins can update reports."
  on public.content_reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins can delete reports
create policy "Admins can delete reports."
  on public.content_reports for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Moderation Takedown RLS Policies for Admins
-- ---------------------------------------------------------------------------
-- Comments takedowns
create policy "Admins can delete any garment comments."
  on public.garment_comments for delete
  using (public.is_admin());

create policy "Admins can delete any look comments."
  on public.look_comments for delete
  using (public.is_admin());

-- Looks takedowns / updates
create policy "Admins can delete any looks."
  on public.looks for delete
  using (public.is_admin());

create policy "Admins can update any looks."
  on public.looks for update
  using (public.is_admin());

-- Garments takedowns / updates
create policy "Admins can delete any garments."
  on public.garments for delete
  using (public.is_admin());

create policy "Admins can update any garments."
  on public.garments for update
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Site Announcement Banner Table & RLS
-- ---------------------------------------------------------------------------
create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default false,
  text text not null check (char_length(text) <= 300),
  link_url text check (link_url is null or char_length(link_url) <= 500),
  link_label text check (link_label is null or char_length(link_label) <= 50),
  style text not null default 'info' check (style in ('info', 'accent', 'warning', 'neutral')),
  dismissible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_banners enable row level security;

-- Everyone can view active banners; admins can view all banners
create policy "Anyone can view active banners."
  on public.site_banners for select
  using (is_active = true or public.is_admin());

-- Only admins can insert banners
create policy "Admins can insert banners."
  on public.site_banners for insert
  with check (public.is_admin());

-- Only admins can update banners
create policy "Admins can update banners."
  on public.site_banners for update
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins can delete banners
create policy "Admins can delete banners."
  on public.site_banners for delete
  using (public.is_admin());
