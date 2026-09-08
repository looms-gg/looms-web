import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createContentReport,
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

  it("updates report status and records action_taken", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "rep-1",
        status: "resolved",
        resolved_by: "admin-1",
        action_taken: "content_deleted",
      },
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.spyOn(supabase, "from").mockReturnValue({
      update: updateMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const result = await updateReportStatus({
      reportId: "rep-1",
      status: "resolved",
      adminId: "admin-1",
      actionTaken: "content_deleted",
    })

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "resolved",
        resolved_by: "admin-1",
        action_taken: "content_deleted",
      }),
    )
    expect(result.status).toBe("resolved")
  })

  it("deletes look target in adminDeleteContent", async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })

    const fromSpy = vi.spyOn(supabase, "from").mockReturnValue({
      delete: deleteMock,
    } as unknown as ReturnType<typeof supabase.from>)

    await adminDeleteContent({ targetType: "look", targetId: "look-999" })
    expect(fromSpy).toHaveBeenCalledWith("looks")
    expect(deleteMock).toHaveBeenCalled()
    expect(eqMock).toHaveBeenCalledWith("id", "look-999")
  })
})
