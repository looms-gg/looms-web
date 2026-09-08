-- Remove unused gems economy column from garments.

create or replace function public.trg_garments_protect_metrics()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;

  if new.added is distinct from old.added
     and current_setting('looms.updating_added', true) is distinct from '1' then
    new.added := old.added;
  end if;

  if new.user_id is distinct from old.user_id then
    new.user_id := old.user_id;
  end if;

  return new;
end;
$$;

alter table public.garments drop column if exists gems;
