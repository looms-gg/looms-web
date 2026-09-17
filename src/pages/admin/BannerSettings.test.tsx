import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BannerSettings } from "./BannerSettings"
import { type SiteBannerRow } from "../../lib/supabase"
import { mockSupabaseFrom, mockSupabaseRpc, type RpcMockController } from "../../test/supabaseMock"

function makeBanner(overrides: Partial<SiteBannerRow> = {}): SiteBannerRow {
  return {
    id: "b-1",
    is_active: true,
    text: "Current active announcement",
    link_url: null,
    link_label: null,
    style: "info",
    dismissible: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
    ...overrides,
  }
}

const cleanupList: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = []

let bannerData: SiteBannerRow | null
let loadError: { message: string } | null = null
let rpcHandler: (fn: string) => { data: unknown; error: { message: string } | null }
let rpc: RpcMockController

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    input instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

async function renderSettings() {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(<BannerSettings />)
    })
    await new Promise((r) => setTimeout(r, 0))
  })
  cleanupList.push({ host, root })
  return host
}

async function submitForm(host: HTMLElement) {
  const form = host.querySelector("form")
  expect(form).not.toBeNull()
  await act(async () => {
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe("BannerSettings", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    bannerData = makeBanner()
    loadError = null
    rpcHandler = () => ({ data: null, error: null })

    const from = mockSupabaseFrom()
    from.setDefaultHandler((query) => {
      throw new Error(`unexpected table in test: ${query.table}`)
    })
    from.on("site_banners", () => ({ data: bannerData, error: loadError }))

    rpc = mockSupabaseRpc()
    rpc.setDefaultHandler((call) => rpcHandler(call.fn))
  })

  afterEach(() => {
    for (const { root, host } of cleanupList.splice(0)) {
      flushSync(() => {
        root.unmount()
      })
      host.remove()
    }
  })

  it("loads the current banner and renders its text", async () => {
    const host = await renderSettings()

    const textarea = host.querySelector<HTMLTextAreaElement>("#banner-text")
    expect(textarea?.value).toBe("Current active announcement")
    expect(host.textContent).toMatch(/Current active announcement/)
  })

  it("saves a valid banner through the admin_save_banner RPC", async () => {
    rpc.on("admin_save_banner", {
      data: makeBanner({ text: "New banner text" }),
      error: null,
    })

    const host = await renderSettings()
    const textarea = host.querySelector<HTMLTextAreaElement>("#banner-text")
    setInputValue(textarea!, "New banner text")

    await submitForm(host)

    expect(rpc.rpcSpy).toHaveBeenCalledWith("admin_save_banner", {
      p_id: "b-1",
      p_is_active: true,
      p_text: "New banner text",
      p_link_url: null,
      p_link_label: null,
      p_style: "info",
      p_dismissible: true,
    })
    const alert = host.querySelector("[role='alert']")
    expect(alert?.textContent).toMatch(/saved successfully/i)
  })

  it("rejects an empty banner text client-side without calling the RPC", async () => {
    const rpcSpy = rpc.rpcSpy

    const host = await renderSettings()
    const textarea = host.querySelector<HTMLTextAreaElement>("#banner-text")
    setInputValue(textarea!, "   ")

    await submitForm(host)

    const alert = host.querySelector("[role='alert']")
    expect(alert?.textContent).toContain("Banner text cannot be empty.")
    expect(rpcSpy).not.toHaveBeenCalled()
  })

  it("masks a hostile save failure behind the friendly error fallback", async () => {
    rpcHandler = () => ({
      data: null,
      error: { message: "new row violates row-level security policy for table site_banners" },
    })

    const host = await renderSettings()
    await submitForm(host)

    const alert = host.querySelector("[role='alert']")
    expect(alert?.textContent).toBe("An unexpected error occurred. Please try again.")
    expect(alert?.textContent).not.toMatch(/row-level|site_banners/)
    expect(host.textContent).toMatch(/Save Banner/)
  })

  it("shows a friendly error when loading the banner fails", async () => {
    loadError = { message: "permission denied for table site_banners" }

    const host = await renderSettings()

    const alert = host.querySelector("[role='alert']")
    expect(alert?.textContent).toBe("An unexpected error occurred. Please try again.")
    expect(host.querySelector<HTMLTextAreaElement>("#banner-text")).not.toBeNull()
  })
})
