import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  dismissBanner,
  fetchActiveSiteBanner,
  getCachedActiveBanner,
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

  it("handles invalid or corrupted dismissal records safely", () => {
    localStorage.setItem("looms_dismissed_site_banner", "not-json{")
    expect(isBannerDismissed("banner-1", "2026-09-08T00:00:00.000Z")).toBe(false)

    localStorage.setItem("looms_dismissed_site_banner", JSON.stringify({ wrong: "shape" }))
    expect(isBannerDismissed("banner-1", "2026-09-08T00:00:00.000Z")).toBe(false)

    localStorage.setItem("looms_dismissed_site_banner", JSON.stringify(null))
    expect(isBannerDismissed("banner-1", "2026-09-08T00:00:00.000Z")).toBe(false)
  })

  it("returns cached banner when valid and null when missing or invalid", () => {
    expect(getCachedActiveBanner()).toBeNull()

    const validBanner = {
      id: "b-1",
      is_active: true,
      text: "Active announcement",
      link_url: "https://example.com",
      link_label: "Link",
      style: "accent",
      dismissible: true,
      created_at: "2026-09-08T00:00:00Z",
      updated_at: "2026-09-08T00:00:00Z",
      updated_by: null,
    }
    localStorage.setItem("looms_last_site_banner", JSON.stringify(validBanner))
    expect(getCachedActiveBanner()).toEqual(validBanner)

    // Corrupted JSON
    localStorage.setItem("looms_last_site_banner", "corrupt-json")
    expect(getCachedActiveBanner()).toBeNull()

    // Invalid style
    localStorage.setItem(
      "looms_last_site_banner",
      JSON.stringify({ ...validBanner, style: "invalid-style" }),
    )
    expect(getCachedActiveBanner()).toBeNull()

    // Missing required fields
    localStorage.setItem(
      "looms_last_site_banner",
      JSON.stringify({ id: "b-1", text: "Missing other fields" }),
    )
    expect(getCachedActiveBanner()).toBeNull()
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
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
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
    } as never)

    const result = await saveSiteBanner({
      isActive: true,
      text: " <script>alert(1)</script>Clean text ",
      linkUrl: "https://looms.gg/studio",
      linkLabel: "<b>Studio</b>",
      style: "accent",
      dismissible: true,
    })

    expect(rpcSpy).toHaveBeenCalledWith("admin_save_banner", {
      p_id: null,
      p_is_active: true,
      p_text: "Clean text",
      p_link_url: "https://looms.gg/studio",
      p_link_label: "Studio",
      p_style: "accent",
      p_dismissible: true,
    })
    expect(result.id).toBe("b-saved")
  })

  it("throws error when banner text is empty", async () => {
    await expect(
      saveSiteBanner({
        isActive: true,
        text: "   ",
        style: "info",
        dismissible: true,
      }),
    ).rejects.toThrow(/Banner text cannot be empty/i)
  })
})
