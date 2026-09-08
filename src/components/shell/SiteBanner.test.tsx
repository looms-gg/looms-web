import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SiteBanner } from "./SiteBanner"
import * as siteBannerApi from "../../lib/siteBanner"
import type { SiteBannerRow } from "../../lib/supabase"

const roots: { root: Root; host: HTMLElement }[] = []

async function renderAsync(ui: React.ReactNode) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(ui)
    })
    await Promise.resolve()
  })
  roots.push({ root, host })
  return host
}

afterEach(() => {
  for (const { root, host } of roots.splice(0)) {
    flushSync(() => {
      root.unmount()
    })
    host.remove()
  }
  vi.restoreAllMocks()
})

describe("SiteBanner", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders active announcement banner with link and icon", async () => {
    const mockBanner: SiteBannerRow = {
      id: "banner-1",
      is_active: true,
      text: "Welcome to the looms Beta!",
      link_url: "https://looms.gg/explore",
      link_label: "Start Exploring",
      style: "info",
      dismissible: true,
      created_at: "2026-09-08T00:00:00Z",
      updated_at: "2026-09-08T00:00:00Z",
      updated_by: null,
    }

    vi.spyOn(siteBannerApi, "fetchActiveSiteBanner").mockResolvedValue(mockBanner)
    vi.spyOn(siteBannerApi, "isBannerDismissed").mockReturnValue(false)

    const host = await renderAsync(<SiteBanner />)

    expect(host.textContent).toMatch(/Welcome to the looms Beta!/i)
    expect(host.textContent).toMatch(/Start Exploring/i)
    const link = host.querySelector('a[href="https://looms.gg/explore"]')
    expect(link).not.toBeNull()
  })

  it("hides when no active banner exists", async () => {
    vi.spyOn(siteBannerApi, "fetchActiveSiteBanner").mockResolvedValue(null)

    const host = await renderAsync(<SiteBanner />)
    expect(host.querySelector("aside")).toBeNull()
  })

  it("dismisses when user clicks close button", async () => {
    const mockBanner: SiteBannerRow = {
      id: "banner-dismiss-test",
      is_active: true,
      text: "Notice to be dismissed",
      link_url: null,
      link_label: null,
      style: "warning",
      dismissible: true,
      created_at: "2026-09-08T00:00:00Z",
      updated_at: "2026-09-08T00:00:00Z",
      updated_by: null,
    }

    vi.spyOn(siteBannerApi, "fetchActiveSiteBanner").mockResolvedValue(mockBanner)
    vi.spyOn(siteBannerApi, "isBannerDismissed").mockReturnValue(false)
    const dismissSpy = vi.spyOn(siteBannerApi, "dismissBanner")

    const host = await renderAsync(<SiteBanner />)

    const closeBtn = host.querySelector('button[aria-label="Dismiss banner"]') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()

    await act(async () => {
      closeBtn.click()
      await Promise.resolve()
    })

    expect(dismissSpy).toHaveBeenCalledWith("banner-dismiss-test", "2026-09-08T00:00:00Z")
    expect(host.querySelector("aside")).toBeNull()
  })
})
