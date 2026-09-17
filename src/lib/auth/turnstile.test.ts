import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  isTurnstileEnabled,
  resolveTurnstileSiteKey,
  loadTurnstileScript,
  _resetTurnstileScriptPromiseForTests,
} from "./turnstile"

describe("turnstile client integration", () => {
  const originalSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const originalDev = import.meta.env.DEV

  beforeEach(() => {
    _resetTurnstileScriptPromiseForTests()
    delete (window as unknown as { turnstile?: unknown }).turnstile
    document.head.innerHTML = ""
  })

  afterEach(() => {
    _resetTurnstileScriptPromiseForTests()
    import.meta.env.VITE_TURNSTILE_SITE_KEY = originalSiteKey
    import.meta.env.DEV = originalDev
    delete (window as unknown as { turnstile?: unknown }).turnstile
    document.head.innerHTML = ""
    vi.restoreAllMocks()
  })

  describe("isTurnstileEnabled", () => {
    it("returns true when VITE_TURNSTILE_SITE_KEY is provided", () => {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = "0x4AAAAAAtestkey"
      expect(isTurnstileEnabled()).toBe(true)
    })

    it("returns false when VITE_TURNSTILE_SITE_KEY is empty or unset", () => {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = ""
      expect(isTurnstileEnabled()).toBe(false)
    })
  })

  describe("resolveTurnstileSiteKey", () => {
    it("returns the configured site key when present", () => {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = "0x4AAAAAAcustomkey"
      expect(resolveTurnstileSiteKey()).toBe("0x4AAAAAAcustomkey")
    })

    it("falls back to the Cloudflare test site key in DEV mode when unset", () => {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = ""
      import.meta.env.DEV = true
      expect(resolveTurnstileSiteKey()).toBe("1x00000000000000000000AA")
    })

    it("returns null in production when unset", () => {
      import.meta.env.VITE_TURNSTILE_SITE_KEY = ""
      import.meta.env.DEV = false
      expect(resolveTurnstileSiteKey()).toBeNull()
    })
  })

  describe("loadTurnstileScript", () => {
    it("resolves immediately if window.turnstile is already loaded", async () => {
      ;(window as unknown as { turnstile: unknown }).turnstile = { render: vi.fn() }
      await expect(loadTurnstileScript()).resolves.toBeUndefined()
      expect(document.head.querySelectorAll("script")).toHaveLength(0)
    })

    it("injects script tag and resolves on script load event", async () => {
      let createdScript: HTMLScriptElement | null = null
      const origCreate = document.createElement.bind(document)
      vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) => {
        const el = origCreate(tag, options)
        if (tag === "script") createdScript = el as HTMLScriptElement
        return el
      })
      vi.spyOn(document.head, "appendChild").mockImplementation((node) => node)

      const loadPromise = loadTurnstileScript()
      const scriptEl = createdScript as HTMLScriptElement | null
      expect(scriptEl).not.toBeNull()
      expect(scriptEl?.src).toContain(
        "challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
      )
      expect(scriptEl?.async).toBe(true)

      // Simulate script load
      scriptEl?.dispatchEvent(new Event("load"))
      await expect(loadPromise).resolves.toBeUndefined()
    })

    it("shares the in-flight promise and does not inject duplicate script tags", () => {
      const appendCalls: Node[] = []
      vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
        appendCalls.push(node)
        return node
      })

      const p1 = loadTurnstileScript()
      const p2 = loadTurnstileScript()
      expect(p1).toBe(p2)
      expect(appendCalls).toHaveLength(1)
    })

    it("rejects on error event", async () => {
      let createdScript: HTMLScriptElement | null = null
      const origCreate = document.createElement.bind(document)
      vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) => {
        const el = origCreate(tag, options)
        if (tag === "script") createdScript = el as HTMLScriptElement
        return el
      })
      vi.spyOn(document.head, "appendChild").mockImplementation((node) => node)

      const loadPromise = loadTurnstileScript()
      const scriptEl = createdScript as HTMLScriptElement | null
      scriptEl?.dispatchEvent(new Event("error"))

      await expect(loadPromise).rejects.toThrow("Failed to load Turnstile script")
    })
  })
})
