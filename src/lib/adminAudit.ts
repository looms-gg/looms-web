import { supabase, type AdminAuditLogRow } from "./supabase"


export async function fetchAdminAuditLog(limit = 50): Promise<AdminAuditLogRow[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
