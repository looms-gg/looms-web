import { supabase, type BlogPostRow } from "../supabase"
import { MAX_LIMITS, sanitizeText, sanitizeUrl } from "../sanitize"
import {
  type BlogPost,
  type BlogCategory,
  BLOG_CATEGORIES,
} from "../../data/blog"
import { coerceProfileEmbed } from "./profileEmbed"

/**
 * Converts any title text to a clean, URL-safe slug.
 * Example: "Introducing Studio 2.0 & New Eyes!" -> "introducing-studio-20-new-eyes"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove accent marks
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric sequences with hyphens
    .replace(/^-+|-+$/g, "") // strip leading/trailing hyphens
    .slice(0, MAX_LIMITS.BLOG_SLUG)
}

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function isValidSlug(slug: string): boolean {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= MAX_LIMITS.BLOG_SLUG &&
    SLUG_REGEX.test(slug)
  )
}

export type SaveBlogPostInput = {
  id?: string | null
  title: string
  slug: string
  excerpt: string
  content: string
  thumbnailUrl?: string | null
  category: BlogCategory
  isPublished: boolean
}

/**
 * A blog_posts row as returned by the embed selects: the fkey join ships the
 * author profile as a `profiles` field whose shape the generated row type
 * does not capture.
 */
export type BlogPostRowWithProfile = BlogPostRow & {
  profiles?: unknown
  author?: unknown
}

export function mapBlogPostRow(
  row: BlogPostRowWithProfile,
): BlogPost {
  const profileData = row.author ?? row.profiles
  const authorProfile = profileData ? coerceProfileEmbed(profileData) : null

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    thumbnailUrl: row.thumbnail_url,
    category: BLOG_CATEGORIES.includes(row.category as BlogCategory)
      ? (row.category as BlogCategory)
      : "Update",
    isPublished: row.is_published,
    publishedAt: row.published_at,
    authorId: row.author_id,
    author: authorProfile
      ? {
          id: row.author_id,
          username: authorProfile.username,
          avatarUrl: authorProfile.avatar_url,
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Fetches published blog posts for public display, optionally filtered by category.
 * When includeDrafts is set, draft posts are returned too (RLS still hides them
 * from non-admins) and sort after all published posts.
 */
export async function fetchPublishedBlogPosts(options?: {
  category?: BlogCategory
  limit?: number
  includeDrafts?: boolean
}): Promise<BlogPost[]> {
  let query = supabase
    .from("blog_posts")
    .select(
      `
      *,
      profiles!blog_posts_author_id_fkey(id, username, avatar_url)
    `,
    )

  if (!options?.includeDrafts) {
    query = query.eq("is_published", true)
  }

  if (options?.category) {
    query = query.eq("category", options.category)
  }

  let orderedQuery = query.order("published_at", {
    ascending: false,
    nullsFirst: false,
  })

  if (options?.limit && options.limit > 0) {
    orderedQuery = orderedQuery.limit(options.limit)
  }

  const { data, error } = await orderedQuery

  if (error) throw error
  if (!data) return []

  return data.map((r) =>
    mapBlogPostRow(r as BlogPostRowWithProfile),
  )
}

/**
 * Fetches a single published blog post by its URL slug.
 */
export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const cleanSlug = slugify(slug)
  if (!cleanSlug) return null

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      profiles!blog_posts_author_id_fkey(id, username, avatar_url)
    `,
    )
    .eq("slug", cleanSlug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapBlogPostRow(data as BlogPostRowWithProfile)
}

/**
 * Fetches all blog posts (both published and draft) for admin management.
 */
export async function fetchAdminBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      `
      *,
      profiles!blog_posts_author_id_fkey(id, username, avatar_url)
    `,
    )
    .order("created_at", { ascending: false })

  if (error) throw error
  if (!data) return []

  return data.map((r) =>
    mapBlogPostRow(r as BlogPostRowWithProfile),
  )
}

/**
 * Creates or updates a blog post via the admin_save_blog_post SECURITY DEFINER RPC.
 */
export async function adminSaveBlogPost(
  input: SaveBlogPostInput,
): Promise<BlogPostRow> {
  const cleanTitle = sanitizeText(input.title, MAX_LIMITS.BLOG_TITLE)
  if (!cleanTitle) {
    throw new Error("Post title cannot be empty.")
  }

  const candidateSlug = slugify(input.slug || input.title)
  if (!isValidSlug(candidateSlug)) {
    throw new Error("Invalid post slug format.")
  }

  const cleanExcerpt = sanitizeText(input.excerpt, MAX_LIMITS.BLOG_EXCERPT)
  if (!cleanExcerpt) {
    throw new Error("Post excerpt cannot be empty.")
  }

  const cleanContent = sanitizeText(input.content, MAX_LIMITS.BLOG_CONTENT, {
    multiline: true,
  })
  if (!cleanContent) {
    throw new Error("Post content cannot be empty.")
  }

  const cleanThumbnail = input.thumbnailUrl
    ? sanitizeUrl(input.thumbnailUrl)
    : null

  const { data, error } = await supabase.rpc("admin_save_blog_post", {
    p_id: input.id ?? null,
    p_title: cleanTitle,
    p_slug: candidateSlug,
    p_excerpt: cleanExcerpt,
    p_content: cleanContent,
    p_thumbnail_url: cleanThumbnail,
    p_category: input.category,
    p_is_published: input.isPublished,
  })

  if (error) throw error
  return data as BlogPostRow
}

/**
 * Deletes a blog post via the admin_delete_blog_post SECURITY DEFINER RPC.
 */
export async function adminDeleteBlogPost(id: string): Promise<void> {
  if (!id) throw new Error("Blog post ID is required.")

  const { error } = await supabase.rpc("admin_delete_blog_post", {
    p_id: id,
  })

  if (error) throw error
}
