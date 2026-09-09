import { supabase, type AdminAuditLogRow } from "./supabase"

export type AdminAuditInput = {
  action: string
  targetTable: string
  targetId?: string | null
  details?: Record<string, unknown> | null
}

/**
 * Records a privileged action in the append-only admin audit log.
 * Never throws: an audit failure must not break the admin action itself.
 */
export async function logAdminAction(input: AdminAuditInput): Promise<void> {
  try {
    const { error } = await supabase.rpc("log_admin_action", {
      p_action: input.action,
      p_target_table: input.targetTable,
      p_target_id: input.targetId ?? null,
      p_details: input.details ?? null,
    })
    if (error) throw error
  } catch (err) {
    console.error("Failed to write admin audit log:", err)
  }
}

export async function fetchAdminAuditLog(limit = 50): Promise<AdminAuditLogRow[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as AdminAuditLogRow[]
}
