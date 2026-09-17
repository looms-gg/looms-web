-- Migration: 20260914000000_blog_system.sql
-- Description: Blog and updates system with HiveMC-style posts, external image support,
-- admin RPC mutations, RLS policies, and admin audit logging.

-- ---------------------------------------------------------------------------
-- 1. Blog Posts Table
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) > 0 and char_length(title) <= 120),
  excerpt text not null check (char_length(excerpt) > 0 and char_length(excerpt) <= 300),
  content text not null check (char_length(content) > 0 and char_length(content) <= 50000),
  thumbnail_url text check (thumbnail_url is null or (char_length(thumbnail_url) <= 1000 and thumbnail_url ~* '^https?://')),
  category text not null default 'Update' check (category in ('Update', 'Announcement', 'Feature', 'Event', 'Community')),
  is_published boolean not null default false,
  published_at timestamptz,
  author_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

create index if not exists idx_blog_posts_published
  on public.blog_posts (is_published, published_at desc nulls last);

create index if not exists idx_blog_posts_slug
  on public.blog_posts (slug);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security Policies
-- ---------------------------------------------------------------------------
-- Public can view published blog posts
create policy "Public can view published blog posts."
  on public.blog_posts for select
  using (is_published = true);

-- Admins can view all blog posts (drafts and published)
create policy "Admins can view all blog posts."
  on public.blog_posts for select
  using (public.is_admin());

-- Mutations: No direct insert/update/delete policies are granted.
-- All mutations flow through dedicated SECURITY DEFINER RPCs below.

-- ---------------------------------------------------------------------------
-- 3. Admin Blog Mutation RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_blog_post(
  p_title text,
  p_slug text,
  p_excerpt text,
  p_content text,
  p_id uuid default null,
  p_thumbnail_url text default null,
  p_category text default 'Update',
  p_is_published boolean default false
)
returns public.blog_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.blog_posts;
  v_slug text;
  v_admin uuid := auth.uid();
begin
  if not public.is_admin(v_admin) then
    raise exception 'admin_save_blog_post: caller is not an admin'
      using errcode = '42501';
  end if;

  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'admin_save_blog_post: title cannot be empty' using errcode = '22023';
  end if;
  if char_length(p_title) > 120 then
    raise exception 'admin_save_blog_post: title exceeds 120 chars' using errcode = '22023';
  end if;

  if p_excerpt is null or char_length(trim(p_excerpt)) = 0 then
    raise exception 'admin_save_blog_post: excerpt cannot be empty' using errcode = '22023';
  end if;
  if char_length(p_excerpt) > 300 then
    raise exception 'admin_save_blog_post: excerpt exceeds 300 chars' using errcode = '22023';
  end if;

  if p_content is null or char_length(trim(p_content)) = 0 then
    raise exception 'admin_save_blog_post: content cannot be empty' using errcode = '22023';
  end if;
  if char_length(p_content) > 50000 then
    raise exception 'admin_save_blog_post: content exceeds 50000 chars' using errcode = '22023';
  end if;

  v_slug := lower(trim(p_slug));
  if v_slug is null or char_length(v_slug) = 0 then
    raise exception 'admin_save_blog_post: slug cannot be empty' using errcode = '22023';
  end if;
  if char_length(v_slug) > 100 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'admin_save_blog_post: invalid slug format' using errcode = '22023';
  end if;

  if p_category not in ('Update', 'Announcement', 'Feature', 'Event', 'Community') then
    raise exception 'admin_save_blog_post: invalid category %', p_category using errcode = '22023';
  end if;

  if p_thumbnail_url is not null and char_length(trim(p_thumbnail_url)) > 0 then
    if char_length(p_thumbnail_url) > 1000 or p_thumbnail_url !~* '^https?://' then
      raise exception 'admin_save_blog_post: thumbnail_url must be a valid http(s) URL' using errcode = '22023';
    end if;
  end if;

  if p_id is null then
    insert into public.blog_posts (
      slug, title, excerpt, content, thumbnail_url, category, is_published,
      published_at, author_id, created_at, updated_at
    )
    values (
      v_slug, trim(p_title), trim(p_excerpt), trim(p_content),
      nullif(trim(p_thumbnail_url), ''), p_category, p_is_published,
      case when p_is_published then now() else null end,
      v_admin, now(), now()
    )
    returning * into v_row;

    perform public.log_admin_action(
      'create_blog_post', 'blog_posts', v_row.id::text,
      jsonb_build_object('title', v_row.title, 'slug', v_row.slug, 'is_published', v_row.is_published)
    );
  else
    update public.blog_posts
      set slug = v_slug,
          title = trim(p_title),
          excerpt = trim(p_excerpt),
          content = trim(p_content),
          thumbnail_url = nullif(trim(p_thumbnail_url), ''),
          category = p_category,
          is_published = p_is_published,
          published_at = case
            when p_is_published and published_at is null then now()
            when not p_is_published then null
            else published_at
          end,
          updated_at = now()
      where id = p_id
      returning * into v_row;

    if not found then
      raise exception 'admin_save_blog_post: post % not found', p_id using errcode = 'P0002';
    end if;

    perform public.log_admin_action(
      'update_blog_post', 'blog_posts', v_row.id::text,
      jsonb_build_object('title', v_row.title, 'slug', v_row.slug, 'is_published', v_row.is_published)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_save_blog_post(text, text, text, text, uuid, text, text, boolean) from public;
revoke all on function public.admin_save_blog_post(text, text, text, text, uuid, text, text, boolean) from anon;
grant execute on function public.admin_save_blog_post(text, text, text, text, uuid, text, text, boolean) to authenticated;

create or replace function public.admin_delete_blog_post(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_title text;
  v_slug text;
begin
  if not public.is_admin(v_admin) then
    raise exception 'admin_delete_blog_post: caller is not an admin'
      using errcode = '42501';
  end if;

  delete from public.blog_posts
  where id = p_id
  returning title, slug into v_title, v_slug;

  if not found then
    raise exception 'admin_delete_blog_post: post % not found', p_id
      using errcode = 'P0002';
  end if;

  perform public.log_admin_action(
    'delete_blog_post', 'blog_posts', p_id::text,
    jsonb_build_object('title', v_title, 'slug', v_slug)
  );
end;
$$;

revoke all on function public.admin_delete_blog_post(uuid) from public;
revoke all on function public.admin_delete_blog_post(uuid) from anon;
grant execute on function public.admin_delete_blog_post(uuid) to authenticated;
