import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createContentReport,
  fetchPendingReportCount,
  fetchReports,
  updateReportStatus,
  adminDeleteContent,
} from "./reports"
import { supabase } from "./supabase"

describe("reports module", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("sanitizes details and submits report", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: "rep-1",
              reporter_id: "u-reporter",
              target_type: "piece",
              target_id: "garment-123",
              reason: "inappropriate",
              details: "NSFW texture used",
              status: "pending",
            },
            error: null,
          }),
      }),
    })

    vi.spyOn(supabase, "from").mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const result = await createContentReport({
      reporterId: "u-reporter",
      targetType: "piece",
      targetId: "garment-123",
      targetLabel: "Piece: Cool Shirt",
      reason: "inappropriate",
      details: "<b>NSFW</b> texture used",
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reporter_id: "u-reporter",
        target_type: "piece",
        target_id: "garment-123",
        target_label: "Piece: Cool Shirt",
        details: "NSFW texture used",
        status: "pending",
      }),
    )
    expect(result.id).toBe("rep-1")
  })

  it("fetches reports with status and targetType filters", async () => {
    const rangeMock = vi.fn().mockResolvedValue({
      data: [{ id: "rep-1", status: "pending", target_type: "look" }],
      error: null,
    })
    const orderMock = vi.fn().mockReturnValue({ range: rangeMock })
    const eqTargetMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqStatusMock = vi.fn().mockReturnValue({ eq: eqTargetMock })

    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: eqStatusMock,
      }),
    } as unknown as ReturnType<typeof supabase.from>)

    const reports = await fetchReports({ status: "pending", targetType: "look" })
    expect(eqStatusMock).toHaveBeenCalledWith("status", "pending")
    expect(eqTargetMock).toHaveBeenCalledWith("target_type", "look")
    expect(reports).toHaveLength(1)
  })

  it("counts pending reports with a head-only query", async () => {
    const eqMock = vi.fn().mockResolvedValue({ count: 7, error: null })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.spyOn(supabase, "from").mockReturnValue({
      select: selectMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const count = await fetchPendingReportCount()
    expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true })
    expect(eqMock).toHaveBeenCalledWith("status", "pending")
    expect(count).toBe(7)
  })

  it("updates report status through the admin RPC", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: {
        id: "rep-1",
        status: "resolved",
        resolved_by: "admin-1",
        action_taken: "content_deleted",
      },
      error: null,
    } as never)

    const result = await updateReportStatus({
      reportId: "rep-1",
      status: "resolved",
      actionTaken: "content_deleted",
    })

    expect(rpcSpy).toHaveBeenCalledWith("admin_resolve_report", {
      p_report_id: "rep-1",
      p_status: "resolved",
      p_action_taken: "content_deleted",
    })
    expect(result.status).toBe("resolved")
  })

  it("deletes content through the admin RPC", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: null,
    } as never)

    await adminDeleteContent({ targetType: "look", targetId: "look-999" })
    expect(rpcSpy).toHaveBeenCalledWith("admin_delete_content", {
      p_target_type: "look",
      p_target_id: "look-999",
      p_sub_type: null,
    })
  })

  it("surfaces RPC errors from adminDeleteContent", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "admin_delete_content: caller is not an admin" },
    } as never)

    await expect(
      adminDeleteContent({ targetType: "look", targetId: "look-999" }),
    ).rejects.toThrow(/caller is not an admin/)
  })

  it("throws error when any query fails in fetchRecentPlatformActivity", async () => {
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const mockResult = table === "looks"
        ? { data: null, error: { message: "Failed to fetch looks" } }
        : { data: [], error: null }
      const limitMock = vi.fn().mockResolvedValue(mockResult)
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
      const selectMock = vi.fn().mockReturnValue({ order: orderMock })
      return { select: selectMock } as never
    })

    const { fetchRecentPlatformActivity } = await import("./reports")
    await expect(fetchRecentPlatformActivity(10)).rejects.toEqual({
      message: "Failed to fetch looks",
    })
  })

  it("calls admin_set_moderation_state RPC with parameters", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: null,
    } as never)

    const { adminSetModerationState } = await import("./reports")
    await adminSetModerationState({
      targetType: "look",
      targetId: "look-123",
      state: "hidden",
      details: { note: "test" },
    })

    expect(rpcSpy).toHaveBeenCalledWith("admin_set_moderation_state", {
      p_target_type: "look",
      p_target_id: "look-123",
      p_state: "hidden",
      p_details: { note: "test" },
    })
  })

  it("surfaces RPC errors from adminSetModerationState", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "caller is not an admin" },
    } as never)

    const { adminSetModerationState } = await import("./reports")
    await expect(
      adminSetModerationState({
        targetType: "piece",
        targetId: "garment-456",
        state: "dmca_down",
      }),
    ).rejects.toEqual({ message: "caller is not an admin" })
  })
})
