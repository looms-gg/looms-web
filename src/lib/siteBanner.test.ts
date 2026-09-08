import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  dismissBanner,
  fetchActiveSiteBanner,
  isBannerDismissed,
  saveSiteBanner,
} from "./siteBanner"
import { supabase } from "./supabase"

describe("siteBanner module", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("handles dismissal persistence via localStorage", () => {
    const bannerId = "banner-123"
    const updatedAt = "2026-09-08T00:00:00.000Z"

    expect(isBannerDismissed(bannerId, updatedAt)).toBe(false)

    dismissBanner(bannerId, updatedAt)
    expect(isBannerDismissed(bannerId, updatedAt)).toBe(true)

    // If banner updated later, it is no longer dismissed
    const newerUpdatedAt = "2026-09-08T01:00:00.000Z"
    expect(isBannerDismissed(bannerId, newerUpdatedAt)).toBe(false)
  })

  it("fetches active banner from supabase", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "b-1",
        is_active: true,
        text: "Special event!",
        style: "info",
        dismissible: true,
        updated_at: "2026-09-08T00:00:00Z",
      },
      error: null,
    })
    const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
    const eqMock = vi.fn().mockReturnValue({ order: orderMock })

    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({ eq: eqMock }),
    } as unknown as ReturnType<typeof supabase.from>)

    const banner = await fetchActiveSiteBanner()
    expect(banner?.text).toBe("Special event!")
  })

  it("sanitizes text and link before saving", async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "b-saved",
        is_active: true,
        text: "Clean text",
        link_url: "https://looms.gg/studio",
        link_label: "Studio",
        style: "accent",
        dismissible: true,
      },
      error: null,
    })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const insertMock = vi.fn().mockReturnValue({ select: selectMock })

    vi.spyOn(supabase, "from").mockReturnValue({
      insert: insertMock,
    } as unknown as ReturnType<typeof supabase.from>)

    const result = await saveSiteBanner({
      isActive: true,
      text: " <script>alert(1)</script>Clean text ",
      linkUrl: "https://looms.gg/studio",
      linkLabel: "<b>Studio</b>",
      style: "accent",
      dismissible: true,
      adminId: "admin-uuid",
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        is_active: true,
        text: "Clean text",
        link_url: "https://looms.gg/studio",
        link_label: "Studio",
        style: "accent",
        dismissible: true,
        updated_by: "admin-uuid",
      }),
    )
    expect(result.id).toBe("b-saved")
  })

  it("throws error when banner text is empty", async () => {
    await expect(
      saveSiteBanner({
        isActive: true,
        text: "   ",
        style: "info",
        dismissible: true,
        adminId: "admin-uuid",
      }),
    ).rejects.toThrow(/Banner text cannot be empty/i)
  })
})
