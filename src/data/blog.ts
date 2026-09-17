export const BLOG_CATEGORIES = [
  "Update",
  "Announcement",
  "Feature",
  "Event",
  "Community",
] as const

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]

export const BLOG_CATEGORY_STYLES: Record<
  BlogCategory,
  { bg: string; text: string; border: string }
> = {
  Update: {
    bg: "bg-sky-500/10 dark:bg-sky-400/15",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
  },
  Announcement: {
    bg: "bg-amber-500/10 dark:bg-amber-400/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  Feature: {
    bg: "bg-emerald-500/10 dark:bg-emerald-400/15",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  Event: {
    bg: "bg-purple-500/10 dark:bg-purple-400/15",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  Community: {
    bg: "bg-pink-500/10 dark:bg-pink-400/15",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20",
  },
}

export type BlogPostAuthor = {
  id: string
  username: string
  avatarUrl: string | null
}

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  thumbnailUrl: string | null
  category: BlogCategory
  isPublished: boolean
  publishedAt: string | null
  authorId: string
  author?: BlogPostAuthor | null
  createdAt: string
  updatedAt: string
}

export const SUPPORTED_BLOG_IMAGE_HOSTS = [
  "i.imgur.com",
  "imgur.com",
  "filegarden.com",
] as const

/** Parse a URL param into a category, or null when it names nothing real. */
export function toBlogCategory(raw: string | null | undefined): BlogCategory | null {
  return raw !== null && BLOG_CATEGORIES.includes(raw as BlogCategory)
    ? (raw as BlogCategory)
    : null
}

/**
 * Validates whether a given URL points to a supported image hosting provider
 * (Imgur or Filegarden).
 */
export function isSupportedBlogImageHost(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === "imgur.com" ||
      hostname.endsWith(".imgur.com") ||
      hostname === "filegarden.com" ||
      hostname.endsWith(".filegarden.com")
    )
  } catch {
    return false
  }
}

/**
 * Normalizes Imgur page URLs to direct image URLs where possible.
 * Example: "https://imgur.com/abc1234" -> "https://i.imgur.com/abc1234.png"
 */
export function normalizeBlogImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    const hostname = parsed.hostname.toLowerCase()

    // If imgur.com/abc1234 (without /a/ or /gallery/) and no extension, convert to i.imgur.com/abc1234.png
    if (
      hostname === "imgur.com" &&
      !parsed.pathname.startsWith("/a/") &&
      !parsed.pathname.startsWith("/gallery/")
    ) {
      const parts = parsed.pathname.split("/").filter(Boolean)
      if (parts.length === 1 && !parts[0].includes(".")) {
        return `https://i.imgur.com/${parts[0]}.png`
      }
    }

    return parsed.href
  } catch {
    return null
  }
}

/**
 * Estimates reading time for a blog post based on standard reading speed (200 wpm).
 * Returns e.g. "1 min read", "4 min read".
 */
export function estimateReadingTime(content: string | null | undefined): string {
  if (!content || typeof content !== "string") return "1 min read"
  const words = content.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return "1 min read"
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min read`
}

