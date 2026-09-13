import { describe, expect, it, vi } from "vitest"
import { supabase } from "./supabase"
import { fetchAdminAuditLog } from "./adminAudit"

describe("adminAudit", () => {

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
