import { logAdminAction } from "./adminAudit"
import { MAX_LIMITS, sanitizeText } from "./sanitize"
import { supabase, type ContentReportRow, type GarmentRow, type LookRow, type ProfileRow } from "./supabase"

export type { ContentReportRow }
export type ReportTargetType = "look" | "piece" | "comment" | "profile"
export type ReportStatus = "pending" | "resolved" | "dismissed"

export type CreateReportInput = {
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  targetSubType?: "garment_comment" | "look_comment" | null
  targetLabel?: string | null
  reason: string
  details?: string | null
}

export const REPORT_REASONS: { id: string; label: string; description: string }[] = [
  { id: "inappropriate", label: "Inappropriate / NSFW", description: "Sexually suggestive, explicit, or gore content" },
  { id: "spam", label: "Spam / Advertising", description: "Promotional links, scams, or repeated bot comments" },
  { id: "harassment", label: "Harassment / Abuse", description: "Hate speech, threats, or targeted bullying" },
  { id: "copyright", label: "Stolen Art / Plagiarism", description: "Content re-uploaded without permission or credit" },
  { id: "other", label: "Other Rule Violation", description: "Violates community guidelines or safety policies" },
]

/**
 * Submits a new moderation report.
 */
export async function createContentReport(input: CreateReportInput): Promise<ContentReportRow> {
  const sanitizedDetails = input.details
    ? sanitizeText(input.details, MAX_LIMITS.REPORT_DETAILS, { multiline: true })
    : null
  const sanitizedLabel = input.targetLabel ? sanitizeText(input.targetLabel, 100) : null
  const sanitizedReason = sanitizeText(input.reason, 100)

  const { data, error } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      target_sub_type: input.targetSubType ?? null,
      target_label: sanitizedLabel,
      reason: sanitizedReason,
      details: sanitizedDetails,
      status: "pending",
      action_taken: null,
      resolved_by: null,
      resolved_at: null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ContentReportRow
}

/**
 * Fetches reports for the moderation queue with optional filtering.
 */
export async function fetchReports(options?: {
  status?: ReportStatus | "all"
  targetType?: ReportTargetType | "all"
  limit?: number
  offset?: number
}): Promise<ContentReportRow[]> {
  let query = supabase.from("content_reports").select("*")

  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status)
  }
  if (options?.targetType && options.targetType !== "all") {
    query = query.eq("target_type", options.targetType)
  }

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as ContentReportRow[]
}

/**
 * Updates a report's status (resolved, dismissed, action_taken).
 */
export async function updateReportStatus({
  reportId,
  status,
  adminId,
  actionTaken,
}: {
  reportId: string
  status: "resolved" | "dismissed"
  adminId: string
  actionTaken?: string
}): Promise<ContentReportRow> {
  const { data, error } = await supabase
    .from("content_reports")
    .update({
      status,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
      action_taken: actionTaken ?? "none",
    })
    .eq("id", reportId)
    .select()
    .single()

  if (error) throw error
  await logAdminAction({
    action: `report_${status}`,
    targetTable: "content_reports",
    targetId: reportId,
    details: { actionTaken: actionTaken ?? "none" },
  })
  return data as ContentReportRow
}

/**
 * Admin action to delete offending content across table types.
 */
export async function adminDeleteContent({
  targetType,
  targetId,
  subType,
}: {
  targetType: ReportTargetType
  targetId: string
  subType?: string | null
}): Promise<void> {
  if (targetType === "look") {
    const { error } = await supabase.from("looks").delete().eq("id", targetId)
    if (error) throw error
    await logAdminAction({ action: "delete_look", targetTable: "looks", targetId })
  } else if (targetType === "piece") {
    const { error } = await supabase.from("garments").delete().eq("id", targetId)
    if (error) throw error
    await logAdminAction({ action: "delete_garment", targetTable: "garments", targetId })
  } else if (targetType === "comment") {
    if (subType === "look_comment") {
      const { error } = await supabase.from("look_comments").delete().eq("id", targetId)
      if (error) throw error
      await logAdminAction({ action: "delete_look_comment", targetTable: "look_comments", targetId })
    } else if (subType === "garment_comment") {
      const { error } = await supabase.from("garment_comments").delete().eq("id", targetId)
      if (error) throw error
      await logAdminAction({ action: "delete_garment_comment", targetTable: "garment_comments", targetId })
    } else {
      // Try both
      const [garmentRes, lookRes] = await Promise.all([
        supabase.from("garment_comments").delete().eq("id", targetId),
        supabase.from("look_comments").delete().eq("id", targetId),
      ])
      if (garmentRes.error && lookRes.error) {
        throw garmentRes.error
      }
      if (!garmentRes.error) {
        await logAdminAction({ action: "delete_garment_comment", targetTable: "garment_comments", targetId })
      }
      if (!lookRes.error) {
        await logAdminAction({ action: "delete_look_comment", targetTable: "look_comments", targetId })
      }
    }
  }
}

export type RecentActivityFeed = {
  looks: LookRow[]
  pieces: GarmentRow[]
  comments: Array<{
    id: string
    targetType: "look" | "garment"
    targetId: string
    userId: string
    body: string
    createdAt: string
  }>
  profiles: ProfileRow[]
}

/**
 * Fetches recent items across the platform for the admin activity feed.
 */
export async function fetchRecentPlatformActivity(limit = 20): Promise<RecentActivityFeed> {
  const [looksRes, piecesRes, garmentCommentsRes, lookCommentsRes, profilesRes] = await Promise.all([
    supabase.from("looks").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("garments").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("garment_comments").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("look_comments").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit),
  ])

  const comments: RecentActivityFeed["comments"] = []

  for (const gc of garmentCommentsRes.data ?? []) {
    comments.push({
      id: gc.id,
      targetType: "garment",
      targetId: gc.garment_id,
      userId: gc.user_id,
      body: gc.body,
      createdAt: gc.created_at,
    })
  }

  for (const lc of lookCommentsRes.data ?? []) {
    comments.push({
      id: lc.id,
      targetType: "look",
      targetId: lc.look_id,
      userId: lc.user_id,
      body: lc.body,
      createdAt: lc.created_at,
    })
  }

  comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    looks: (looksRes.data ?? []) as LookRow[],
    pieces: (piecesRes.data ?? []) as GarmentRow[],
    comments: comments.slice(0, limit),
    profiles: (profilesRes.data ?? []) as ProfileRow[],
  }
}
