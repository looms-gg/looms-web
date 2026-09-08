-- Alter garments.added to bigint to support millisecond timestamps (e.g. Date.now())
alter table public.garments
  alter column added type bigint;
