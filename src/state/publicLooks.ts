import { supabase } from "../lib/supabase"
import type { SkinModel } from "../skin/convert"
import { bodyOrDefault } from "../data/bodies"
import { clampHue, type Look } from "./persist"
import { asLookDescription, asLookVisibility } from "./lookMeta"
import { equippedFromStack } from "../data/outfit"

export type LookSort = "Trending" | "Popular" | "Newest"
export type LookModelFilter = "all" | "classic" | "slim"

export type PublicLook = {
  id: string
  userId: string
  name: string
  description: string
  visibility: "public" | "private"
  stack: string[]
  bodyId: string
  bodyHue: number
  model: SkinModel
  likeCount: number
  createdAt: number
  updatedAt: number
  maker: string
  makerAvatarUrl: string | null
  recentLikeCount?: number
}

function asMakerProfileEmbed(value: unknown): { username: string; avatar_url: string | null } {
  if (value == null) return { username: "maker", avatar_url: null }
  if (Array.isArray(value)) {
    const first = value[0] as { username?: unknown; avatar_url?: unknown } | undefined
    return {
      username: typeof first?.username === "string" ? first.username : "maker",
      avatar_url: typeof first?.avatar_url === "string" ? first.avatar_url : null,
    }
  }
  if (typeof value === "object") {
    const obj = value as { username?: unknown; avatar_url?: unknown }
    return {
      username: typeof obj.username === "string" ? obj.username : "maker",
      avatar_url: typeof obj.avatar_url === "string" ? obj.avatar_url : null,
    }
  }
  return { username: "maker", avatar_url: null }
}

export function mapLookEmbedRow(row: {
  id: string
  user_id: string
  name: string
  description: string
  visibility: string
  stack: string[]
  body_id: string
  body_hue: number
  model: string
  like_count?: number
  created_at: string
  updated_at: string
  profiles?: unknown
  recent_like_count?: number
  username?: string
  avatar_url?: string | null
}): PublicLook {
  let maker = "maker"
  let makerAvatarUrl: string | null = null

  if (row.username) {
    maker = row.username
    makerAvatarUrl = row.avatar_url ?? null
  } else if (row.profiles) {
    const p = asMakerProfileEmbed(row.profiles)
    maker = p.username
    makerAvatarUrl = p.avatar_url
  }

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: asLookDescription(row.description),
    visibility: asLookVisibility(row.visibility),
    stack: Array.isArray(row.stack) ? row.stack : [],
    bodyId: bodyOrDefault(row.body_id).id,
    bodyHue: clampHue(row.body_hue),
    model: row.model === "slim" ? "slim" : "classic",
    likeCount: typeof row.like_count === "number" ? row.like_count : 0,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    maker,
    makerAvatarUrl,
    recentLikeCount: row.recent_like_count,
  }
}

export function publicLookToLook(publicLook: PublicLook): Look {
  return {
    id: publicLook.id,
    name: publicLook.name,
    stack: publicLook.stack,
    equipped: equippedFromStack(publicLook.stack),
    bodyId: publicLook.bodyId,
    bodyHue: publicLook.bodyHue,
    model: publicLook.model,
    savedAt: publicLook.createdAt,
    description: publicLook.description,
    visibility: publicLook.visibility,
  }
}

export const DEFAULT_FEATURED_LOOKS: PublicLook[] = [
  {
    id: "featured-winter-explorer",
    userId: "system",
    name: "Winter Explorer",
    description: "Cozy winter layers for exploring snowy biomes.",
    visibility: "public",
    stack: ["ash-crop", "winter-coat", "dark-sweatpants", "knee-high-converse"],
    bodyId: "slate",
    bodyHue: 0,
    model: "classic",
    likeCount: 42,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    updatedAt: Date.now() - 1000 * 60 * 60 * 6,
    maker: "loomsteam",
    makerAvatarUrl: null,
    recentLikeCount: 15,
  },
  {
    id: "featured-streetwear-classic",
    userId: "system",
    name: "Street Casual",
    description: "Urban streetwear with fresh sneakers and relaxed jacket.",
    visibility: "public",
    stack: ["ink-fall", "open-plaid", "baggy-skull-pants", "sneakers"],
    bodyId: "sand",
    bodyHue: 0,
    model: "classic",
    likeCount: 31,
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    maker: "pixelwear",
    makerAvatarUrl: null,
    recentLikeCount: 9,
  },
  {
    id: "featured-cyber-wanderer",
    userId: "system",
    name: "Cyber Wanderer",
    description: "Futuristic neon accents with sleek boots and dark visor.",
    visibility: "public",
    stack: ["rose-drape", "striped-coat", "camo-pants", "brown-shoes"],
    bodyId: "ash",
    bodyHue: 200,
    model: "slim",
    likeCount: 27,
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    updatedAt: Date.now() - 1000 * 60 * 60 * 18,
    maker: "neoncraft",
    makerAvatarUrl: null,
    recentLikeCount: 7,
  },
]

export function filterAndSortPublicLooks(
  looks: PublicLook[],
  query: string,
  sort: LookSort,
  model: LookModelFilter,
): PublicLook[] {
  const q = query.trim().toLowerCase()
  const filtered = looks.filter((look) => {
    if (model !== "all" && look.model !== model) return false
    if (!q) return true
    return (
      look.name.toLowerCase().includes(q) ||
      look.maker.toLowerCase().includes(q) ||
      (look.description && look.description.toLowerCase().includes(q))
    )
  })

  return [...filtered].sort((a, b) => {
    if (sort === "Popular") {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount
      return b.createdAt - a.createdAt
    }
    if (sort === "Trending") {
      // Velocity-aware HN-style decay:
      //   recent likes (past 24h) act as the velocity signal x 3
      //   total likes decay by sqrt(age in hours) to penalise staleness
      const ageHoursA = Math.max(2, (Date.now() - a.createdAt) / 3_600_000)
      const ageHoursB = Math.max(2, (Date.now() - b.createdAt) / 3_600_000)
      const scoreA = (a.recentLikeCount ?? 0) * 3 + a.likeCount / Math.sqrt(ageHoursA)
      const scoreB = (b.recentLikeCount ?? 0) * 3 + b.likeCount / Math.sqrt(ageHoursB)
      return scoreB - scoreA
    }
    // Newest
    return b.createdAt - a.createdAt
  })
}

export async function fetchPublicLooksFeed(): Promise<PublicLook[]> {
  try {
    const { data, error } = await supabase
      .from("looks")
      .select("*, profiles!looks_user_id_fkey(username, avatar_url)")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })

    if (error) throw error
    return ((data as unknown[]) ?? []).map((row) =>
      mapLookEmbedRow(row as Parameters<typeof mapLookEmbedRow>[0]),
    )
  } catch {
    return []
  }
}

export async function fetchTrendingLooksPastDay(limit = 3): Promise<PublicLook[]> {
  try {
    // 1. Try get_trending_looks_past_day RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_trending_looks_past_day",
      { p_limit: limit },
    )

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const trending = rpcData.map((row) =>
        mapLookEmbedRow(row as Parameters<typeof mapLookEmbedRow>[0]),
      )
      if (trending.length >= limit) return trending.slice(0, limit)
      // Fill remaining with all-time public looks
      const feed = await fetchPublicLooksFeed()
      const seen = new Set(trending.map((l) => l.id))
      for (const look of feed) {
        if (!seen.has(look.id)) {
          trending.push(look)
          seen.add(look.id)
          if (trending.length >= limit) break
        }
      }
      if (trending.length >= limit) return trending.slice(0, limit)
    }

    // 2. Fallback: query public looks feed sorted by likes / recency
    const feed = await fetchPublicLooksFeed()
    if (feed.length > 0) {
      const sorted = [...feed].sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt)
      const results = [...sorted]
      for (const def of DEFAULT_FEATURED_LOOKS) {
        if (results.length >= limit) break
        if (!results.some((r) => r.id === def.id)) {
          results.push(def)
        }
      }
      return results.slice(0, limit)
    }

    return DEFAULT_FEATURED_LOOKS.slice(0, limit)
  } catch {
    return DEFAULT_FEATURED_LOOKS.slice(0, limit)
  }
}

/**
 * The look that won yesterday (most likes in the 48h→24h window), or null
 * when no look earned the crown or the lookup failed — the hero simply
 * renders without a crown in that case.
 */
export async function fetchYesterdayTopLook(): Promise<PublicLook | null> {
  try {
    const { data, error } = await supabase.rpc("get_yesterday_top_look")
    if (error) return null
    const rows = Array.isArray(data) ? data : []
    if (rows.length === 0) return null
    return mapLookEmbedRow(rows[0] as Parameters<typeof mapLookEmbedRow>[0])
  } catch {
    return null
  }
}

export async function fetchLookById(id: string): Promise<PublicLook | null> {
  const featured = DEFAULT_FEATURED_LOOKS.find((l) => l.id === id)
  if (featured) return featured

  try {
    const { data, error } = await supabase
      .from("looks")
      .select("*, profiles!looks_user_id_fkey(username, avatar_url)")
      .eq("id", id)
      .maybeSingle()

    if (error || !data) return null
    return mapLookEmbedRow(data as Parameters<typeof mapLookEmbedRow>[0])
  } catch {
    return null
  }
}
