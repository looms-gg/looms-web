import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InspectorModal } from "./InspectorModal"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

describe("InspectorModal", () => {
  it("renders title, children, and closes via the close button", () => {
    const onClose = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <InspectorModal open title="Look details" onClose={onClose}>
          <p>Inspector body</p>
        </InspectorModal>,
      )
    })

    expect(host.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe(
      "Look details",
    )
    expect(host.textContent).toContain("Inspector body")

    const close = host.querySelector('button[aria-label="Close"]') as HTMLButtonElement
    expect(close).not.toBeNull()
    flushSync(() => {
      close.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
