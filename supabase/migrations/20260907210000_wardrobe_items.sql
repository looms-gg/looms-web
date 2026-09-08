-- wardrobe_items: profile-owned saved garments (catalog + uploads)
-- Replace garments.worn with garments.saved_count maintained by triggers.

alter table public.garments
  add column if not exists saved_count integer not null default 0;

-- Preserve existing popularity numbers where present
update public.garments
   set saved_count = worn
 where worn > 0
   and saved_count = 0;

alter table public.garments
  drop column if exists worn;

create table if not exists public.wardrobe_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  garment_id text not null references public.garments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, garment_id)
);

create index if not exists idx_wardrobe_items_user_created
  on public.wardrobe_items (user_id, created_at desc);

alter table public.wardrobe_items enable row level security;

drop policy if exists "Users can read own wardrobe items." on public.wardrobe_items;
create policy "Users can read own wardrobe items."
  on public.wardrobe_items for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert own wardrobe items." on public.wardrobe_items;
create policy "Users can insert own wardrobe items."
  on public.wardrobe_items for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can delete own wardrobe items." on public.wardrobe_items;
create policy "Users can delete own wardrobe items."
  on public.wardrobe_items for delete
  using ( auth.uid() = user_id );

-- Extend quota helper
create or replace function public.check_user_quota(
  p_table text,
  p_max_rows integer
)
returns void as $$
declare
  v_user_id uuid;
  v_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return;
  end if;

  if p_table = 'garments' then
    select count(*) into v_count from public.garments where user_id = v_user_id;
  elsif p_table = 'looks' then
    select count(*) into v_count from public.looks where user_id = v_user_id;
  elsif p_table = 'likes' then
    select count(*) into v_count from public.likes where user_id = v_user_id;
  elsif p_table = 'wardrobe_items' then
    select count(*) into v_count from public.wardrobe_items where user_id = v_user_id;
  else
    return;
  end if;

  if v_count >= p_max_rows then
    raise exception 'Account quota exceeded: maximum % % allowed per account. Please remove older items before creating new ones.',
      p_max_rows, p_table
      using errcode = 'P0001';
  end if;
end;
$$ language plpgsql security definer;

-- Protect saved_count from client UPDATEs
create or replace function public.trg_garments_protect_saved_count()
returns trigger as $$
begin
  if new.saved_count is distinct from old.saved_count
     and current_setting('looms.updating_saved_count', true) is distinct from '1' then
    new.saved_count := old.saved_count;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_garments_protect_saved_count on public.garments;
create trigger trg_garments_protect_saved_count
  before update on public.garments
  for each row execute procedure public.trg_garments_protect_saved_count();

create or replace function public.trg_wardrobe_items_saved_count_ins()
returns trigger as $$
begin
  perform set_config('looms.updating_saved_count', '1', true);
  update public.garments
     set saved_count = saved_count + 1
   where id = new.garment_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.trg_wardrobe_items_saved_count_del()
returns trigger as $$
begin
  perform set_config('looms.updating_saved_count', '1', true);
  update public.garments
     set saved_count = greatest(saved_count - 1, 0)
   where id = old.garment_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_wardrobe_items_saved_count_ins on public.wardrobe_items;
create trigger trg_wardrobe_items_saved_count_ins
  after insert on public.wardrobe_items
  for each row execute procedure public.trg_wardrobe_items_saved_count_ins();

drop trigger if exists trg_wardrobe_items_saved_count_del on public.wardrobe_items;
create trigger trg_wardrobe_items_saved_count_del
  after delete on public.wardrobe_items
  for each row execute procedure public.trg_wardrobe_items_saved_count_del();

-- Quota 500 + rate limit 60 / 10 minutes
create or replace function public.trg_wardrobe_items_rate_limit_and_quota()
returns trigger as $$
begin
  perform public.check_user_quota('wardrobe_items', 500);
  perform public.check_rate_limit('wardrobe_add', 60, 600);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_wardrobe_items_rate_limit on public.wardrobe_items;
create trigger trg_wardrobe_items_rate_limit
  before insert on public.wardrobe_items
  for each row execute procedure public.trg_wardrobe_items_rate_limit_and_quota();

-- Uploads always join the uploader's wardrobe
create or replace function public.trg_garments_auto_wardrobe()
returns trigger as $$
begin
  insert into public.wardrobe_items (user_id, garment_id)
  values (new.user_id, new.id)
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_garments_auto_wardrobe on public.garments;
create trigger trg_garments_auto_wardrobe
  after insert on public.garments
  for each row execute procedure public.trg_garments_auto_wardrobe();
