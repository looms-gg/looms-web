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

export async function fetchGarmentComments(garmentId: string): Promise<GarmentComment[]> {
  const { data, error } = await supabase
    .from("garment_comments")
    .select("*, profiles!garment_comments_user_id_fkey(username)")
    .eq("garment_id", garmentId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return ((data ?? []) as CommentRow[]).map(mapComment)
}

export async function createGarmentComment(input: {
  garmentId: string
  userId: string
  body: string
  parentId?: string | null
}): Promise<GarmentComment> {
  const body = sanitizeText(input.body, MAX_LIMITS.COMMENT, { multiline: true })
  if (!body) throw new Error("Comment cannot be empty.")

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

  if (error) throw error
  if (!data) throw new Error("Couldn't create comment.")
  return mapComment(data as CommentRow)
}

export async function updateGarmentComment(input: {
  id: string
  userId: string
  body: string
}): Promise<GarmentComment> {
  const body = sanitizeText(input.body, MAX_LIMITS.COMMENT, { multiline: true })
  if (!body) throw new Error("Comment cannot be empty.")

  const { data, error } = await supabase
    .from("garment_comments")
    .update({ body })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*, profiles!garment_comments_user_id_fkey(username)")
    .single()

  if (error) throw error
  if (!data) throw new Error("Couldn't update comment.")
  return mapComment(data as CommentRow)
}

export async function deleteGarmentComment(input: {
  id: string
  userId: string
}): Promise<void> {
  const { error } = await supabase
    .from("garment_comments")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId)
  if (error) throw error
}
