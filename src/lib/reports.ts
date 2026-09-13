import { MAX_LIMITS, sanitizeText } from "./sanitize"
import {
  supabase,
  type ContentReportRow,
  type GarmentRow,
  type LookRow,
  type ProfileRow,
  type ReportStatus,
  type ReportTargetType,
} from "./supabase"

export type { ContentReportRow, ReportStatus, ReportTargetType }

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
  return data
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
  return data ?? []
}

/**
 * Updates a report's status via the admin_resolve_report SECURITY DEFINER
 * RPC, which sets resolved_by from the server session and writes the audit
 * row in the same transaction.
 */
export async function updateReportStatus({
  reportId,
  status,
  actionTaken,
}: {
  reportId: string
  status: "resolved" | "dismissed"
  actionTaken?: string
}): Promise<ContentReportRow> {
  const { data, error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: reportId,
    p_status: status,
    p_action_taken: actionTaken ?? null,
  })

  if (error) throw error
  return data as ContentReportRow
}

/** Targets the admin_delete_content RPC can delete; profiles have no content row. */
export type AdminDeletableTarget = Exclude<ReportTargetType, "profile">

/**
 * Admin action to delete offending content across table types, via the
 * admin_delete_content SECURITY DEFINER RPC (is_admin gate + audit in the
 * same transaction). Comment targets can arrive without a subType (older
 * reports); the RPC falls back to deleting from both comment tables and
 * audits whichever actually held the row. Profile targets are rejected by
 * the RPC's type check as well — they have no deletable content row.
 */
export async function adminDeleteContent({
  targetType,
  targetId,
  subType,
}: {
  targetType: AdminDeletableTarget
  targetId: string
  subType?: string | null
}): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_content", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_sub_type: subType ?? null,
  })
  if (error) throw error
}

export type ModerationState = "ok" | "hidden" | "dmca_down"

/**
 * Admin action to set moderation state ('ok', 'hidden', 'dmca_down') on looks
 * or garments via the admin_set_moderation_state SECURITY DEFINER RPC.
 */
export async function adminSetModerationState({
  targetType,
  targetId,
  state,
  details = null,
}: {
  targetType: "look" | "piece"
  targetId: string
  state: ModerationState
  details?: Record<string, unknown> | null
}): Promise<void> {
  const { error } = await supabase.rpc("admin_set_moderation_state", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_state: state,
    p_details: details,
  })
  if (error) throw error
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
  profiles: Array<Omit<ProfileRow, "last_seen_at">>
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

  for (const res of [looksRes, piecesRes, garmentCommentsRes, lookCommentsRes, profilesRes]) {
    if (res.error) throw res.error
  }

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
    looks: looksRes.data ?? [],
    pieces: piecesRes.data ?? [],
    comments: comments.slice(0, limit),
    profiles: profilesRes.data ?? [],
  }
}
