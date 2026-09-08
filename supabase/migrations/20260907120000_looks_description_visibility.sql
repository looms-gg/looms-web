alter table public.looks
  add column if not exists description text not null default '',
  add column if not exists visibility text not null default 'private';

alter table public.looks
  drop constraint if exists looks_visibility_check;

alter table public.looks
  add constraint looks_visibility_check
  check (visibility in ('private', 'public'));
