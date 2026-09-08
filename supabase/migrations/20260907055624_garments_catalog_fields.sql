-- Align garments with closet slots and piece metadata so the shop can live in Postgres.

alter table public.garments
  alter column id drop default;

alter table public.garments
  alter column id type text using id::text;

alter table public.garments
  alter column id set default (gen_random_uuid())::text;

alter table public.garments drop constraint if exists garments_slot_check;

alter table public.garments
  add constraint garments_slot_check
  check (slot in ('hair', 'hat', 'face', 'shirt', 'coat', 'pants', 'shoes'));

alter table public.garments
  add column if not exists body_group text not null default 'torso',
  add column if not exists gems integer not null default 0,
  add column if not exists worn integer not null default 0,
  add column if not exists added bigint not null default 0,
  add column if not exists covers text[] not null default '{}';

alter table public.garments
  alter column added type bigint;

alter table public.garments drop constraint if exists garments_body_group_check;

alter table public.garments
  add constraint garments_body_group_check
  check (body_group in ('head', 'torso', 'legs'));
