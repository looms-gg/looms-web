-- Migration: 20260907151000_profile_show_likes.sql
-- Description: Profile privacy flag for public likes visibility + tighten likes SELECT RLS.

alter table public.profiles
  add column if not exists show_likes boolean not null default true;

-- Replace public likes select with owner-or-show_likes policy
drop policy if exists "Likes are viewable by everyone." on public.likes;

create policy "Likes are viewable by owner or when profile allows."
  on public.likes for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
        from public.profiles p
       where p.id = likes.user_id
         and p.show_likes = true
    )
  );
