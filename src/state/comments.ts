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

type CommentProfileEmbed = { username: string } | { username: string }[] | null

/** Explicit join shape for garment_comments + profiles(username). */
export type CommentEmbedRow = {
  id: string
  garment_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
  profiles: CommentProfileEmbed
}

function asProfileEmbed(value: unknown): CommentProfileEmbed {
  if (value == null) return null
  if (Array.isArray(value)) {
    return value
      .filter((item): item is { username: string } =>
        Boolean(item) && typeof item === "object" && typeof (item as { username?: unknown }).username === "string",
      )
      .map((item) => ({ username: item.username }))
  }
  if (typeof value === "object" && typeof (value as { username?: unknown }).username === "string") {
    return { username: (value as { username: string }).username }
  }
  return null
}

function usernameFrom(profiles: CommentProfileEmbed) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles
  return profile?.username?.trim() || "maker"
}

export function mapCommentEmbed(row: CommentEmbedRow): GarmentComment {
  return {
    id: row.id,
    garmentId: row.garment_id,
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    username: usernameFrom(row.profiles),
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

const COMMENT_SELECT = "*, profiles!garment_comments_user_id_fkey(username)"

function embedFromJoined(row: {
  id: string
  garment_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
  profiles: CommentProfileEmbed
}): GarmentComment {
  return mapCommentEmbed(row)
}

export async function fetchGarmentComments(garmentId: string): Promise<GarmentComment[]> {
  const { data, error } = await supabase
    .from("garment_comments")
    .select(COMMENT_SELECT)
    .eq("garment_id", garmentId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []).map((row) =>
    embedFromJoined({
      id: row.id,
      garment_id: row.garment_id,
      user_id: row.user_id,
      parent_id: row.parent_id,
      body: row.body,
      created_at: row.created_at,
      updated_at: row.updated_at,
      profiles: asProfileEmbed(row.profiles),
    }),
  )
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
    .select(COMMENT_SELECT)
    .single()

  if (error) throw error
  if (!data) throw new Error("Couldn't create comment.")
  return embedFromJoined({
    id: data.id,
    garment_id: data.garment_id,
    user_id: data.user_id,
    parent_id: data.parent_id,
    body: data.body,
    created_at: data.created_at,
    updated_at: data.updated_at,
    profiles: asProfileEmbed(data.profiles),
  })
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
    .select(COMMENT_SELECT)
    .single()

  if (error) throw error
  if (!data) throw new Error("Couldn't update comment.")
  return embedFromJoined({
    id: data.id,
    garment_id: data.garment_id,
    user_id: data.user_id,
    parent_id: data.parent_id,
    body: data.body,
    created_at: data.created_at,
    updated_at: data.updated_at,
    profiles: asProfileEmbed(data.profiles),
  })
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
