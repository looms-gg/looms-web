import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { LoomsLogo } from "./LoomsLogo"

describe("LoomsLogo", () => {
  it("renders the full mark with an accessible name by default", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<LoomsLogo />)
    })
    const img = host.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("alt")).toBe("looms")
    expect(img?.getAttribute("src")).toContain("looms-full")
    expect(img?.getAttribute("width")).toBe("1422")
    expect(img?.getAttribute("height")).toBe("504")
  })

  it("renders the wordmark variant when requested", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<LoomsLogo variant="wordmark" decorative />)
    })
    const img = host.querySelector("img")
    expect(img?.getAttribute("alt")).toBe("")
    expect(img?.getAttribute("src")).toContain("looms-workmark")
  })
})
