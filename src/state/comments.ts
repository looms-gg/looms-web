import { supabase } from "../lib/supabase"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"

export type CommentTargetType = "garment" | "look"

export type CommentItem = {
  id: string
  targetType: CommentTargetType
  targetId: string
  userId: string
  parentId: string | null
  body: string
  createdAt: number
  updatedAt: number
  username: string
  garmentId?: string
  lookId?: string
}

export type GarmentComment = CommentItem & {
  garmentId: string
}

export type LookComment = CommentItem & {
  lookId: string
}

type CommentProfileEmbed = { username: string } | { username: string }[] | null

export type CommentEmbedRow = {
  id: string
  target_id: string
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
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { username?: unknown }).username === "string",
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

export function mapCommentRow(
  targetType: CommentTargetType,
  row: {
    id: string
    user_id: string
    parent_id: string | null
    body: string
    created_at: string
    updated_at: string
    profiles: unknown
    garment_id?: string
    look_id?: string
  },
): CommentItem {
  const targetId = (targetType === "garment" ? row.garment_id : row.look_id) ?? ""
  return {
    id: row.id,
    targetType,
    targetId,
    garmentId: targetType === "garment" ? targetId : undefined,
    lookId: targetType === "look" ? targetId : undefined,
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    username: usernameFrom(asProfileEmbed(row.profiles)),
  }
}

export function nestComments<T extends { id: string; parentId: string | null; createdAt: number }>(
  comments: T[],
): Array<T & { replies: T[] }> {
  const roots = comments.filter((c) => !c.parentId)
  const replies = comments.filter((c) => c.parentId)
  return roots.map((root) => ({
    ...root,
    replies: replies
      .filter((r) => r.parentId === root.id)
      .sort((a, b) => a.createdAt - b.createdAt),
  }))
}

const GARMENT_COMMENT_SELECT = "*, profiles!garment_comments_user_id_fkey(username)"
const LOOK_COMMENT_SELECT = "*, profiles!look_comments_user_id_fkey(username)"

export async function fetchComments(
  targetType: CommentTargetType,
  targetId: string,
): Promise<CommentItem[]> {
  if (targetType === "garment") {
    const { data, error } = await supabase
      .from("garment_comments")
      .select(GARMENT_COMMENT_SELECT)
      .eq("garment_id", targetId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return ((data as unknown[]) ?? []).map((row) =>
      mapCommentRow("garment", row as Parameters<typeof mapCommentRow>[1]),
    )
  }

  const { data, error } = await supabase
    .from("look_comments")
    .select(LOOK_COMMENT_SELECT)
    .eq("look_id", targetId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return ((data as unknown[]) ?? []).map((row) =>
    mapCommentRow("look", row as Parameters<typeof mapCommentRow>[1]),
  )
}

export async function createComment(input: {
  targetType: CommentTargetType
  targetId: string
  userId: string
  body: string
  parentId?: string | null
}): Promise<CommentItem> {
  const body = sanitizeText(input.body, MAX_LIMITS.COMMENT, { multiline: true })
  if (!body) throw new Error("Comment cannot be empty.")

  if (input.targetType === "garment") {
    const { data, error } = await supabase
      .from("garment_comments")
      .insert({
        garment_id: input.targetId,
        user_id: input.userId,
        parent_id: input.parentId ?? null,
        body,
      })
      .select(GARMENT_COMMENT_SELECT)
      .single()

    if (error) throw error
    if (!data) throw new Error("Couldn't create comment.")
    return mapCommentRow("garment", data as Parameters<typeof mapCommentRow>[1])
  }

  const { data, error } = await supabase
    .from("look_comments")
    .insert({
      look_id: input.targetId,
      user_id: input.userId,
      parent_id: input.parentId ?? null,
      body,
    })
    .select(LOOK_COMMENT_SELECT)
    .single()

  if (error) throw error
  if (!data) throw new Error("Couldn't create comment.")
  return mapCommentRow("look", data as Parameters<typeof mapCommentRow>[1])
}

export async function updateComment(input: {
  targetType: CommentTargetType
  id: string
  userId: string
  body: string
}): Promise<CommentItem> {
  const body = sanitizeText(input.body, MAX_LIMITS.COMMENT, { multiline: true })
  if (!body) throw new Error("Comment cannot be empty.")

  if (input.targetType === "garment") {
    const { data, error } = await supabase
      .from("garment_comments")
      .update({ body })
      .eq("id", input.id)
      .eq("user_id", input.userId)
      .select(GARMENT_COMMENT_SELECT)
      .single()

    if (error) throw error
    if (!data) throw new Error("Couldn't update comment.")
    return mapCommentRow("garment", data as Parameters<typeof mapCommentRow>[1])
  }

  const { data, error } = await supabase
    .from("look_comments")
    .update({ body })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select(LOOK_COMMENT_SELECT)
    .single()

  if (error) throw error
  if (!data) throw new Error("Couldn't update comment.")
  return mapCommentRow("look", data as Parameters<typeof mapCommentRow>[1])
}

export async function deleteComment(input: {
  targetType: CommentTargetType
  id: string
  userId: string
}): Promise<void> {
  if (input.targetType === "garment") {
    const { error } = await supabase
      .from("garment_comments")
      .delete()
      .eq("id", input.id)
      .eq("user_id", input.userId)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("look_comments")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId)

  if (error) throw error
}

/* ================= Backward-compatible Garment Comment Helpers ================= */

export async function fetchGarmentComments(garmentId: string): Promise<GarmentComment[]> {
  const items = await fetchComments("garment", garmentId)
  return items.map((item) => ({ ...item, garmentId: item.targetId }))
}

export async function createGarmentComment(input: {
  garmentId: string
  userId: string
  body: string
  parentId?: string | null
}): Promise<GarmentComment> {
  const item = await createComment({
    targetType: "garment",
    targetId: input.garmentId,
    userId: input.userId,
    body: input.body,
    parentId: input.parentId,
  })
  return { ...item, garmentId: item.targetId }
}

export async function updateGarmentComment(input: {
  id: string
  userId: string
  body: string
}): Promise<GarmentComment> {
  const item = await updateComment({
    targetType: "garment",
    id: input.id,
    userId: input.userId,
    body: input.body,
  })
  return { ...item, garmentId: item.targetId }
}

export async function deleteGarmentComment(input: {
  id: string
  userId: string
}): Promise<void> {
  return deleteComment({ targetType: "garment", id: input.id, userId: input.userId })
}

/* ================= Look Comment Helpers ================= */

export async function fetchLookComments(lookId: string): Promise<LookComment[]> {
  const items = await fetchComments("look", lookId)
  return items.map((item) => ({ ...item, lookId: item.targetId }))
}

export async function createLookComment(input: {
  lookId: string
  userId: string
  body: string
  parentId?: string | null
}): Promise<LookComment> {
  const item = await createComment({
    targetType: "look",
    targetId: input.lookId,
    userId: input.userId,
    body: input.body,
    parentId: input.parentId,
  })
  return { ...item, lookId: item.targetId }
}

export async function updateLookComment(input: {
  id: string
  userId: string
  body: string
}): Promise<LookComment> {
  const item = await updateComment({
    targetType: "look",
    id: input.id,
    userId: input.userId,
    body: input.body,
  })
  return { ...item, lookId: item.targetId }
}

export async function deleteLookComment(input: {
  id: string
  userId: string
}): Promise<void> {
  return deleteComment({ targetType: "look", id: input.id, userId: input.userId })
}
