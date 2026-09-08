import { supabase } from "../lib/supabase"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"

export type GarmentComment = {
  id: string
  garmentId: string
  userId: string
  parentId: string | null
  body: string
  createdAt: number
  updatedAt: number
  username: string
}

type CommentRow = {
  id: string
  garment_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
  profiles: { username: string } | { username: string }[] | null
}

function usernameFrom(row: CommentRow) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return profile?.username?.trim() || "maker"
}

function mapComment(row: CommentRow): GarmentComment {
  return {
    id: row.id,
    garmentId: row.garment_id,
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    username: usernameFrom(row),
  }
}

export function nestComments(comments: GarmentComment[]) {
  const roots = comments.filter((c) => !c.parentId)
  const replies = comments.filter((c) => c.parentId)
  return roots.map((root) => ({
    ...root,
    replies: replies
      .filter((r) => r.parentId === root.id)
      .sort((a, b) => a.createdAt - b.createdAt),
  }))
}

export async function fetchGarmentComments(garmentId: string) {
  const { data, error } = await supabase
    .from("garment_comments")
    .select("*, profiles!garment_comments_user_id_fkey(username)")
    .eq("garment_id", garmentId)
    .order("created_at", { ascending: true })

  if (error) return { comments: [] as GarmentComment[], error }
  return {
    comments: ((data ?? []) as CommentRow[]).map(mapComment),
    error: null,
  }
}

export async function createGarmentComment(input: {
  garmentId: string
  userId: string
  body: string
  parentId?: string | null
}) {
  const body = sanitizeText(input.body, MAX_LIMITS.COMMENT, { multiline: true })
  if (!body) {
    return { comment: null, error: { message: "Comment cannot be empty." } }
  }

  const { data, error } = await supabase
    .from("garment_comments")
    .insert({
      garment_id: input.garmentId,
      user_id: input.userId,
      parent_id: input.parentId ?? null,
      body,
    })
    .select("*, profiles!garment_comments_user_id_fkey(username)")
    .single()

  if (error || !data) return { comment: null, error }
  return { comment: mapComment(data as CommentRow), error: null }
}

export async function updateGarmentComment(id: string, userId: string, bodyRaw: string) {
  const body = sanitizeText(bodyRaw, MAX_LIMITS.COMMENT, { multiline: true })
  if (!body) {
    return { comment: null, error: { message: "Comment cannot be empty." } }
  }

  const { data, error } = await supabase
    .from("garment_comments")
    .update({ body })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*, profiles!garment_comments_user_id_fkey(username)")
    .single()

  if (error || !data) return { comment: null, error }
  return { comment: mapComment(data as CommentRow), error: null }
}

export async function deleteGarmentComment(id: string) {
  const { error } = await supabase.from("garment_comments").delete().eq("id", id)
  return { error }
}
