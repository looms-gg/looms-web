-- Like counts on garments + allow text garment ids on likes

alter table public.likes
  alter column target_id type text using target_id::text;

alter table public.garments
  add column if not exists like_count integer not null default 0;

update public.garments g
set like_count = coalesce((
  select count(*)::int from public.likes l
  where l.target_type = 'garment' and l.target_id = g.id
), 0);

create or replace function public.trg_garments_protect_like_count()
returns trigger as $$
begin
  if new.like_count is distinct from old.like_count
     and current_setting('looms.updating_like_count', true) is distinct from '1' then
    new.like_count := old.like_count;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_garments_protect_like_count on public.garments;
create trigger trg_garments_protect_like_count
  before update on public.garments
  for each row execute procedure public.trg_garments_protect_like_count();

create or replace function public.trg_likes_garment_count_ins()
returns trigger as $$
begin
  if new.target_type = 'garment' then
    perform set_config('looms.updating_like_count', '1', true);
    update public.garments
       set like_count = like_count + 1
     where id = new.target_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.trg_likes_garment_count_del()
returns trigger as $$
begin
  if old.target_type = 'garment' then
    perform set_config('looms.updating_like_count', '1', true);
    update public.garments
       set like_count = greatest(like_count - 1, 0)
     where id = old.target_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_likes_garment_count_ins on public.likes;
create trigger trg_likes_garment_count_ins
  after insert on public.likes
  for each row execute procedure public.trg_likes_garment_count_ins();

drop trigger if exists trg_likes_garment_count_del on public.likes;
create trigger trg_likes_garment_count_del
  after delete on public.likes
  for each row execute procedure public.trg_likes_garment_count_del();
