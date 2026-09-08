import type { GarmentRow, LookRow, ProfileRow } from "../../lib/supabase"
import { supabase } from "../../lib/supabase"
import type { LikeTargetType } from "../../state/likeKey"
import { mapProfileRow, PROFILE_SELECT } from "../../lib/mapProfileRow"

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
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("username", username)
    .maybeSingle()

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
  return (data as GarmentRow[]) ?? []
}

export async function fetchPublicLooks(userId: string): Promise<LookRow[]> {
  const { data, error } = await supabase
    .from("looks")
    .select("*")
    .eq("user_id", userId)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })

  if (error) throw error
  return (data as LookRow[]) ?? []
}

export async function fetchLikedContent(userId: string): Promise<LikedContent> {
  const { data: likeRows, error: likeError } = await supabase
    .from("likes")
    .select("target_type, target_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (likeError) throw likeError

  const likes: LikedTargetRef[] = []
  const garmentIds: string[] = []
  const lookIds: string[] = []

  for (const row of likeRows ?? []) {
    if (row.target_type !== "garment" && row.target_type !== "look") continue
    const ref = {
      target_type: row.target_type as LikeTargetType,
      target_id: row.target_id,
    }
    likes.push(ref)
    if (ref.target_type === "garment") garmentIds.push(ref.target_id)
    else lookIds.push(ref.target_id)
  }

  const [garmentRes, lookRes] = await Promise.all([
    garmentIds.length
      ? supabase.from("garments").select("*").in("id", garmentIds).eq("is_public", true)
      : Promise.resolve({ data: [] as GarmentRow[], error: null }),
    lookIds.length
      ? supabase.from("looks").select("*").in("id", lookIds).eq("visibility", "public")
      : Promise.resolve({ data: [] as LookRow[], error: null }),
  ])

  if (garmentRes.error) throw garmentRes.error
  if (lookRes.error) throw lookRes.error

  return orderLikedTargets(
    likes,
    (garmentRes.data as GarmentRow[]) ?? [],
    (lookRes.data as LookRow[]) ?? [],
  )
}
