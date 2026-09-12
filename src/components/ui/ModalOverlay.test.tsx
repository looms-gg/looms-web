import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModalOverlay } from "./ModalOverlay"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  document.body.style.overflow = ""
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

describe("ModalOverlay", () => {
  it("mounts the dialog as soon as open becomes true", () => {
    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => {
      root.render(
        <ModalOverlay open labelledBy="t">
          <h2 id="t">Hello</h2>
        </ModalOverlay>,
      )
    })

    expect(host.querySelector('[role="dialog"]')?.textContent).toContain("Hello")

    flushSync(() => root.unmount())
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

    flushSync(() => root.unmount())
  })

  it("locks body scroll while open and releases it on close", () => {
    let open = true
    function Probe() {
      return (
        <ModalOverlay open={open} onClose={() => {}} portal={false} labelledBy="t">
          <h2 id="t">Hi</h2>
        </ModalOverlay>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => root.render(<Probe />))
    expect(document.body.style.overflow).toBe("hidden")

    open = false
    flushSync(() => root.render(<Probe />))
    expect(document.body.style.overflow).toBe("")

    flushSync(() => root.unmount())
  })

  it("restores a pre-existing inline body overflow on close", () => {
    document.body.style.overflow = "scroll"

    let open = true
    function Probe() {
      return (
        <ModalOverlay open={open} onClose={() => {}} portal={false} labelledBy="t">
          <h2 id="t">Hi</h2>
        </ModalOverlay>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => root.render(<Probe />))
    expect(document.body.style.overflow).toBe("hidden")

    open = false
    flushSync(() => root.render(<Probe />))
    expect(document.body.style.overflow).toBe("scroll")

    flushSync(() => root.unmount())
  })

  // Regression: stacked overlays used to restore "hidden" after the last one
  // closed, leaving the page permanently unscrollable until reload.
  it("keeps the lock while a stacked overlay is still open", () => {
    let a = true
    let b = true
    function Stack() {
      return (
        <>
          <ModalOverlay open={a} onClose={() => {}} portal={false} labelledBy="a">
            <h2 id="a">A</h2>
          </ModalOverlay>
          <ModalOverlay open={b} onClose={() => {}} portal={false} labelledBy="b">
            <h2 id="b">B</h2>
          </ModalOverlay>
        </>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => root.render(<Stack />))
    expect(document.body.style.overflow).toBe("hidden")

    a = false
    flushSync(() => root.render(<Stack />))
    expect(document.body.style.overflow).toBe("hidden")

    flushSync(() => root.unmount())
    expect(document.body.style.overflow).toBe("")
  })

  // Regression: the first-opened overlay closing last used to restore the
  // second overlay's "hidden" capture and the body stayed scroll-locked.
  it("releases the lock when the first-opened overlay closes last", () => {
    let a = true
    let b = true
    function Stack() {
      return (
        <>
          <ModalOverlay open={a} onClose={() => {}} portal={false} labelledBy="a">
            <h2 id="a">A</h2>
          </ModalOverlay>
          <ModalOverlay open={b} onClose={() => {}} portal={false} labelledBy="b">
            <h2 id="b">B</h2>
          </ModalOverlay>
        </>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => root.render(<Stack />))
    expect(document.body.style.overflow).toBe("hidden")

    a = false
    flushSync(() => root.render(<Stack />))
    expect(document.body.style.overflow).toBe("hidden")

    b = false
    flushSync(() => root.render(<Stack />))
    expect(document.body.style.overflow).toBe("")

    flushSync(() => root.unmount())
  })
})
