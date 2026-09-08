-- Replace security-definer profiles_view with presence table + RLS.
-- last_seen_at moves off public.profiles so direct selects cannot leak it.

drop view if exists public.profiles_view;

-- Restore column grants on profiles before drop (clean slate)
grant select (last_seen_at) on table public.profiles to anon, authenticated;

create table if not exists public.profile_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz
);

alter table public.profile_presence enable row level security;

drop policy if exists "Presence visible to subject or when profile allows." on public.profile_presence;
create policy "Presence visible to subject or when profile allows."
  on public.profile_presence for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
       where p.id = profile_presence.user_id
         and p.show_last_seen = true
    )
  );

-- No client INSERT/UPDATE/DELETE policies — only touch_last_seen (definer) writes.

revoke all on table public.profile_presence from public;
grant select on table public.profile_presence to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on table public.profile_presence from anon, authenticated;

-- Backfill from profiles.last_seen_at
insert into public.profile_presence (user_id, last_seen_at)
select id, last_seen_at
  from public.profiles
 where last_seen_at is not null
on conflict (user_id) do update
  set last_seen_at = excluded.last_seen_at;

alter table public.profiles drop column if exists last_seen_at;

create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  insert into public.profile_presence (user_id, last_seen_at)
  values (v_uid, now())
  on conflict (user_id) do update
    set last_seen_at = excluded.last_seen_at
  where public.profile_presence.last_seen_at is null
     or public.profile_presence.last_seen_at < now() - interval '5 minutes';
end;
$$;

revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;
