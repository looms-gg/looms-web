/**
 * Comment mutations throw raw errors (lib-layer contract); callers catch and
 * route through formatErrorMessage. See the convention note in
 * src/lib/errorFormat.ts for why this differs from the state contexts.
 */
import { supabase } from "../lib/supabase"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { coerceProfileEmbed } from "../lib/profileEmbed"

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
    userId: row.user_id,
    parentId: row.parent_id,
    body: row.body,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    username: coerceProfileEmbed(row.profiles).username,
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
