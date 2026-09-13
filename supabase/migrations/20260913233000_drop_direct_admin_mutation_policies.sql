-- Migration: 20260913233000_drop_direct_admin_mutation_policies.sql
-- Description: Drop direct table mutation policies for admins on content_reports,
-- site_banners, looks, garments, and comment tables.
-- All privileged admin mutations must flow through dedicated SECURITY DEFINER RPCs
-- (admin_delete_content, admin_resolve_report, admin_save_banner, admin_set_moderation_state)
-- which atomically enforce is_admin(), execute the mutation, and write to admin_audit_log.

-- 1. Site banners: revoke direct admin write policies (flow through admin_save_banner)
drop policy if exists "Admins can insert banners." on public.site_banners;
drop policy if exists "Admins can update banners." on public.site_banners;
drop policy if exists "Admins can delete banners." on public.site_banners;

-- 2. Content reports: revoke direct admin update/delete policies (flow through admin_resolve_report)
drop policy if exists "Admins can update reports." on public.content_reports;
drop policy if exists "Admins can delete reports." on public.content_reports;

-- 3. Comments: revoke direct admin delete policies (flow through admin_delete_content)
drop policy if exists "Admins can delete any garment comments." on public.garment_comments;
drop policy if exists "Admins can delete any look comments." on public.look_comments;

-- 4. Looks & garments: revoke direct admin update/delete policies (flow through admin_delete_content / admin_set_moderation_state)
drop policy if exists "Admins can delete any looks." on public.looks;
drop policy if exists "Admins can update any looks." on public.looks;
drop policy if exists "Admins can delete any garments." on public.garments;
drop policy if exists "Admins can update any garments." on public.garments;

