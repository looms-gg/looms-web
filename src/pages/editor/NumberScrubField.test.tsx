import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { useState, act } from "react"
import { NumberScrubField } from "./NumberScrubField"

const setNativeValue = (el: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
  descriptor?.set?.call(el, value)
}

describe("NumberScrubField", () => {
  it("renders the formatted value", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField label="Size" value={3} min={1} max={8} step={1} onChange={vi.fn()} />,
      )
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.value).toBe("3")
    expect(input.getAttribute("aria-label")).toBe("Size")
  })

  it("commits a typed value on Enter", () => {
    const onChange = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField label="Size" value={1} min={1} max={8} step={1} onChange={onChange} />,
      )
    })
    const input = host.querySelector("input") as HTMLInputElement
    flushSync(() => {
      setNativeValue(input, "5")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it("clamps typed values to min and max", () => {
    const onChange = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField label="Opacity" value={0.5} min={0} max={1} step={0.05} onChange={onChange} />,
      )
    })
    const input = host.querySelector("input") as HTMLInputElement
    flushSync(() => {
      setNativeValue(input, "2")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(onChange).toHaveBeenCalledWith(1)

    flushSync(() => {
      setNativeValue(input, "-1")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it("scrubs the value with pointer drag", () => {
    const onChange = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField label="Size" value={4} min={1} max={8} step={1} onChange={onChange} />,
      )
    })
    const input = host.querySelector("input") as HTMLInputElement

    const rect = { left: 100, width: 60 }
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue(rect as DOMRect)

    input.dispatchEvent(
      new PointerEvent("pointerdown", { pointerId: 1, clientX: 130, bubbles: true }),
    )
    input.dispatchEvent(
      new PointerEvent("pointermove", { pointerId: 1, clientX: 150, bubbles: true }),
    )
    input.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, bubbles: true }))

    expect(onChange).toHaveBeenCalled()
  })

  it("scales typed text through a custom parse", () => {
    const onChange = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField
          label="Opacity"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          onChange={onChange}
          parse={(n) => n / 100}
        />,
      )
    })
    const input = host.querySelector("input") as HTMLInputElement
    flushSync(() => {
      setNativeValue(input, "50")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it("keeps the display in sync while scrubbing after a click", async () => {
    const host = document.createElement("div")
    const Wrapper = () => {
      const [value, setValue] = useState(4)
      return (
        <NumberScrubField
          label="Size"
          value={value}
          min={1}
          max={8}
          step={1}
          onChange={setValue}
          format={(v) => `${Math.round(v)}px`}
        />
      )
    }
    flushSync(() => createRoot(host).render(<Wrapper />))
    const input = host.querySelector("input") as HTMLInputElement

    vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
      left: 100,
      width: 60,
    } as DOMRect)

    await act(async () => {
      input.dispatchEvent(
        new PointerEvent("pointerdown", { pointerId: 1, clientX: 130, bubbles: true }),
      )
      input.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientX: 150, bubbles: true }),
      )
    })
    expect(input.value).toBe("6px")
  })

  it("allows keyboard adjustments with arrow keys", () => {
    const onChange = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField label="Size" value={4} min={1} max={8} step={1} onChange={onChange} />,
      )
    })
    const input = host.querySelector("input") as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(5)
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("shows an instant hover tooltip naming the option", () => {
    const onChange = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField
          label="Opacity"
          value={0.5}
          min={0}
          max={1}
          step={0.05}
          onChange={onChange}
        />,
      )
    })

    // With no tip prop, the field name is the tooltip
    act(() => {
      ;(host.querySelector("span") as HTMLElement).dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true }),
      )
    })
    const tip = document.querySelector("span[role='tooltip']") as HTMLElement
    expect(tip.textContent).toBe("Opacity")

    // The scrub input still works inside the tooltip wrapper
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.getAttribute("aria-label")).toBe("Opacity")

    document.querySelectorAll("span[role='tooltip']").forEach((n) => n.remove())
  })

  it("lets a call site override the tooltip text", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <NumberScrubField
          label="Size"
          value={4}
          min={1}
          max={8}
          step={1}
          onChange={vi.fn()}
          tip="Custom name"
        />,
      )
    })

    act(() => {
      ;(host.querySelector("span") as HTMLElement).dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true }),
      )
    })
    const tip = document.querySelector("span[role='tooltip']") as HTMLElement
    expect(tip.textContent).toBe("Custom name")

    document.querySelectorAll("span[role='tooltip']").forEach((n) => n.remove())
  })
})
