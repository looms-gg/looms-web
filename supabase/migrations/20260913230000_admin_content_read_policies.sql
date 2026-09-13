-- Migration: 20260913230000_admin_content_read_policies.sql
-- Description: Grant admins uniform read access on garments, looks, and comments tables
-- so admin moderation surfaces and report investigation can view hidden or private content.
-- Profiles table is already viewable by everyone (using true) so it does not need an admin clause.

drop policy if exists "Public garments are viewable by everyone; private garments by owner." on public.garments;
create policy "Public garments are viewable by everyone; private garments by owner."
  on public.garments for select
  using (
    (is_public = true and moderation_state = 'ok')
    or auth.uid() = user_id
    or public.is_admin()
  );

drop policy if exists "Public looks are viewable by everyone." on public.looks;
create policy "Public looks are viewable by everyone."
  on public.looks for select
  using (
    (visibility = 'public' and moderation_state = 'ok')
    or auth.uid() = user_id
    or public.is_admin()
  );

drop policy if exists "Comments on public garments are viewable by everyone." on public.garment_comments;
create policy "Comments on public garments are viewable by everyone."
  on public.garment_comments for select
  using (
    exists (
      select 1 from public.garments g
       where g.id = garment_comments.garment_id
         and (g.is_public = true or g.user_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "Comments on public looks are viewable by everyone." on public.look_comments;
create policy "Comments on public looks are viewable by everyone."
  on public.look_comments for select
  using (
    exists (
      select 1 from public.looks l
       where l.id = look_comments.look_id
         and (l.visibility = 'public' or l.user_id = auth.uid())
    )
    or public.is_admin()
  );

