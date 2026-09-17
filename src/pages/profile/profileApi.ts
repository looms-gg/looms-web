import type { LookRow, ProfileRow } from "../../lib/supabase"
import type { GarmentRow } from "../../data/garment"
import { supabase } from "../../lib/supabase"
import type { LikeTargetType } from "../../data/likeTarget"
import { fetchProfileRow, mapProfileRow } from "../../lib/content/mapProfileRow"

export type LikedTargetRef = {
  target_type: LikeTargetType
  target_id: string
}

export type LikedContent = {
  garments: GarmentRow[]
  looks: LookRow[]
  order: LikedTargetRef[]
}

export function orderLikedTargets(
  likes: LikedTargetRef[],
  garments: GarmentRow[],
  looks: LookRow[],
): LikedContent {
  const garmentMap = new Map(garments.map((g) => [g.id, g]))
  const lookMap = new Map(looks.map((l) => [l.id, l]))
  const orderedGarments: GarmentRow[] = []
  const orderedLooks: LookRow[] = []
  const order: LikedTargetRef[] = []

  for (const like of likes) {
    if (like.target_type === "garment") {
      const g = garmentMap.get(like.target_id)
      if (g) {
        orderedGarments.push(g)
        order.push(like)
      }
    } else {
      const l = lookMap.get(like.target_id)
      if (l) {
        orderedLooks.push(l)
        order.push(like)
      }
    }
  }

  return { garments: orderedGarments, looks: orderedLooks, order }
}

export async function fetchProfileByUsername(
  username: string,
): Promise<ProfileRow | null> {
  const { data, error } = await fetchProfileRow("username", username)

  if (error) throw error
  return data ? mapProfileRow(data) : null
}

export async function fetchPublicUploads(userId: string): Promise<GarmentRow[]> {
  const { data, error } = await supabase
    .from("garments")
    .select("*")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("added", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchPublicLooks(userId: string): Promise<LookRow[]> {
  const { data, error } = await supabase
    .from("looks")
    .select("*")
    .eq("user_id", userId)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

function partitionLikes(
  likeRows: Array<{ target_type: string; target_id: string }>,
): {
  likes: LikedTargetRef[]
  garmentIds: string[]
  lookIds: string[]
} {
  const likes: LikedTargetRef[] = []
  const garmentIds: string[] = []
  const lookIds: string[] = []

  for (const row of likeRows) {
    if (row.target_type !== "garment" && row.target_type !== "look") continue
    const ref: LikedTargetRef = {
      target_type: row.target_type,
      target_id: row.target_id,
    }
    likes.push(ref)
    if (ref.target_type === "garment") {
      garmentIds.push(ref.target_id)
    } else {
      lookIds.push(ref.target_id)
    }
  }

  return { likes, garmentIds, lookIds }
}

async function fetchPublicGarmentsByIds(ids: string[]): Promise<GarmentRow[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from("garments")
    .select("*")
    .in("id", ids)
    .eq("is_public", true)
  if (error) throw error
  return data ?? []
}

async function fetchPublicLooksByIds(ids: string[]): Promise<LookRow[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from("looks")
    .select("*")
    .in("id", ids)
    .eq("visibility", "public")
  if (error) throw error
  return data ?? []
}

export async function fetchLikedContent(userId: string): Promise<LikedContent> {
  const { data: likeRows, error: likeError } = await supabase
    .from("likes")
    .select("target_type, target_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (likeError) throw likeError

  const { likes, garmentIds, lookIds } = partitionLikes(likeRows ?? [])

  const [garments, looks] = await Promise.all([
    fetchPublicGarmentsByIds(garmentIds),
    fetchPublicLooksByIds(lookIds),
  ])

  return orderLikedTargets(likes, garments, looks)
}
