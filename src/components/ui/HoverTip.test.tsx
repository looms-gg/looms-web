import { describe, it, expect, afterEach } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react"
import { HoverTip } from "./HoverTip"

function hover(wrapper: HTMLElement) {
  act(() => {
    wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
  })
}

function unhover(wrapper: HTMLElement) {
  act(() => {
    wrapper.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }))
  })
}

describe("HoverTip", () => {
  afterEach(() => {
    document.querySelectorAll("span[role='tooltip']").forEach((n) => n.remove())
  })

  it("renders nothing until the control is hovered", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <HoverTip tip="Brush Size">
          <button type="button">4px</button>
        </HoverTip>,
      )
    })

    expect(host.querySelector("button")?.textContent).toBe("4px")
    expect(document.querySelector("span[role='tooltip']")).toBeNull()
  })

  it("appears instantly on hover, portaled under the control", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <HoverTip tip="Brush Size">
          <button type="button">4px</button>
        </HoverTip>,
      )
    })

    hover(host.querySelector("span") as HTMLElement)

    const tip = document.querySelector("span[role='tooltip']") as HTMLElement
    expect(tip).not.toBeNull()
    expect(tip.textContent).toBe("Brush Size")
    // Lives in document.body so overflow containers cannot clip it
    expect(tip.parentElement).toBe(document.body)
    // Fixed + below the control, above sibling popovers
    expect(tip.className).toContain("fixed")
    expect(tip.className).toContain("z-[90]")
    expect(tip.style.transform).toBe("translateX(-50%)")
  })

  it("disappears when the pointer leaves", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <HoverTip tip="Opacity">
          <input aria-label="Opacity" />
        </HoverTip>,
      )
    })

    const wrapper = host.querySelector("span") as HTMLElement
    hover(wrapper)
    expect(document.querySelector("span[role='tooltip']")).not.toBeNull()

    unhover(wrapper)
    expect(document.querySelector("span[role='tooltip']")).toBeNull()
  })

  it("reveals on keyboard focus too", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <HoverTip tip="Symmetry (Mirror)">
          <button type="button">On</button>
        </HoverTip>,
      )
    })

    act(() => {
      ;(host.querySelector("span") as HTMLElement).dispatchEvent(
        new FocusEvent("focusin", { bubbles: true }),
      )
    })
    const tip = document.querySelector("span[role='tooltip']") as HTMLElement
    expect(tip?.textContent).toBe("Symmetry (Mirror)")
  })

  it("can be suppressed while an overlapping popover is open", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <HoverTip tip="Bucket Fill Mode" visible={false}>
          <button type="button">Face</button>
        </HoverTip>,
      )
    })

    hover(host.querySelector("span") as HTMLElement)
    expect(document.querySelector("span[role='tooltip']")).toBeNull()
  })
})
