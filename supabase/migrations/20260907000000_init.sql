-- Migration: 20260907_init.sql
-- Description: Core tables, RLS policies, trigger and storage for looms Supabase integration

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  minecraft_username text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Auto-provision profile on auth signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, minecraft_username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'minecraft_username'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Looks Table (Saved Layered Outfits)
create table if not exists public.looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  stack text[] not null default '{}',
  body_id text not null default 'slate',
  body_hue integer not null default 0,
  model text not null check (model in ('classic', 'slim')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.looks enable row level security;

create policy "Users can manage their own looks."
  on public.looks for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 3. Garments Table (Clothing pieces)
create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  slot text not null check (slot in ('top', 'bottoms', 'shoes', 'outer', 'accessory', 'headwear')),
  texture_url text not null,
  is_public boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.garments enable row level security;

create policy "Public garments are viewable by everyone; private garments by owner."
  on public.garments for select
  using ( is_public = true or auth.uid() = user_id );

create policy "Authenticated users can create garments."
  on public.garments for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own garments."
  on public.garments for update
  using ( auth.uid() = user_id );

create policy "Users can delete own garments."
  on public.garments for delete
  using ( auth.uid() = user_id );

-- 4. Storage Buckets (garments)
insert into storage.buckets (id, name, public)
values ('garments', 'garments', true)
on conflict (id) do nothing;

create policy "Garment textures are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'garments' );

create policy "Authenticated users can upload garment textures."
  on storage.objects for insert
  with check (
    bucket_id = 'garments'
    and auth.role() = 'authenticated'
  );
