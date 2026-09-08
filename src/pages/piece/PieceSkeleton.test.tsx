import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { PieceSkeleton } from "./PieceSkeleton"

describe("PieceSkeleton", () => {
  it("mirrors the piece layout with an accessible loading status", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<PieceSkeleton />)
    })

    const status = host.querySelector('[role="status"]') as HTMLElement
    expect(status).toBeTruthy()
    expect(status.getAttribute("aria-busy")).toBe("true")
    expect(status.getAttribute("aria-label")).toBe("Loading piece")
    expect(host.querySelectorAll(".profile-bone").length).toBeGreaterThan(6)
  })
})
