import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import {
  getCanonicalUrl,
  getPieceShareUrl,
  getLookShareUrl,
  copyShareLink,
} from "./share"

describe("share helpers", () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    // Restore window.location if modified
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    })
  })

  it("computes canonical URL using window.location.origin when available", () => {
    const url = getCanonicalUrl("/piece/ink-fall")
    expect(url).toBe(`${window.location.origin}/piece/ink-fall`)
  })

  it("handles paths without leading slash", () => {
    const url = getCanonicalUrl("look/winter-explorer")
    expect(url).toBe(`${window.location.origin}/look/winter-explorer`)
  })

  it("generates piece and look share URLs", () => {
    expect(getPieceShareUrl("ink-fall")).toBe(`${window.location.origin}/piece/ink-fall`)
    expect(getLookShareUrl("look-123")).toBe(`${window.location.origin}/look/look-123`)
  })

  it("copies via navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: { writeText },
    })

    const success = await copyShareLink("https://looms-gg.github.io/piece/ink-fall")
    expect(success).toBe(true)
    expect(writeText).toHaveBeenCalledWith("https://looms-gg.github.io/piece/ink-fall")
  })

  it("falls back to document.execCommand when clipboard API throws", async () => {
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
    })
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, "execCommand", {
      value: execCommand,
      writable: true,
      configurable: true,
    })

    const success = await copyShareLink("https://looms-gg.github.io/piece/ink-fall")
    expect(success).toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
  })
})
