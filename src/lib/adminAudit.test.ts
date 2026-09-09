import { describe, expect, it, vi } from "vitest"
import { supabase } from "./supabase"
import { fetchAdminAuditLog, logAdminAction } from "./adminAudit"

describe("adminAudit", () => {
  it("logs an action through the RPC and swallows RPC failures", async () => {
    const rpc = vi
      .spyOn(supabase, "rpc")
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce({ data: null, error: null } as never)
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await logAdminAction({ action: "delete_garment", targetTable: "garments", targetId: "g1" })

    expect(rpc).toHaveBeenNthCalledWith(1, "log_admin_action", {
      p_action: "delete_garment",
      p_target_table: "garments",
      p_target_id: "g1",
      p_details: null,
    })
    expect(errSpy).toHaveBeenCalled()

    errSpy.mockRestore()
  })

  it("fetches the audit log newest-first with a limit", async () => {
    const rows = [{ id: "a1" }]
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    const from = vi.spyOn(supabase, "from").mockReturnValue(builder as never)

    const result = await fetchAdminAuditLog(25)

    expect(from).toHaveBeenCalledWith("admin_audit_log")
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(25)
    expect(result).toEqual(rows)
  })
})
