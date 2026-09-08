import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModalOverlay } from "./ModalOverlay"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

describe("ModalOverlay", () => {
  it("mounts the dialog as soon as open becomes true", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ModalOverlay open labelledBy="t" portal={false}>
          <h2 id="t">Hello</h2>
        </ModalOverlay>,
      )
    })

    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Hello")
  })

  it("keeps the dialog mounted briefly on close for exit", () => {
    let open = true
    function Probe() {
      return (
        <ModalOverlay open={open} onClose={() => {}} portal={false} labelledBy="t">
          <h2 id="t">Bye</h2>
        </ModalOverlay>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => {
      root.render(<Probe />)
    })
    expect(host.querySelector('[role="dialog"]')).toBeTruthy()

    open = false
    flushSync(() => {
      root.render(<Probe />)
    })
    expect(host.querySelector('[role="dialog"]')).toBeTruthy()
    expect((host.querySelector(".modal-scrim") as HTMLElement).className).not.toContain(
      "is-open",
    )

    flushSync(() => {
      vi.advanceTimersByTime(200)
    })
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  })
})
