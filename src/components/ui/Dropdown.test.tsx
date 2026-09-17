import { describe, it, expect, afterEach, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react"
import { Dropdown } from "./Dropdown"

const options = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
]

function mount(
  host: HTMLDivElement,
  onChange: (id: string) => void = () => {},
) {
  act(() => {
    flushSync(() => {
      createRoot(host).render(
        <Dropdown
          options={options}
          value="a"
          onChange={onChange}
          ariaLabel="Test dropdown"
        />,
      )
    })
  })
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("Dropdown", () => {
  it("shows the selected option label and no panel initially", () => {
    const host = document.createElement("div")
    mount(host)
    const trigger = host.querySelector<HTMLButtonElement>(
      "button[type=button]",
    )!
    expect(trigger.textContent).toContain("Alpha")
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(host.textContent).not.toContain("Charlie")
  })

  it("opens a menu, checks the selected item, and closes after choosing", () => {
    const host = document.createElement("div")
    const onChange = vi.fn()
    mount(host, onChange)

    act(() => {
      host.querySelector<HTMLButtonElement>("button[type=button]")!.click()
    })
    expect(host.textContent).toContain("Charlie")

    const checked = host.querySelector<HTMLElement>('[aria-checked="true"]')!
    expect(checked.textContent).toContain("Alpha")

    const unselected = host.querySelectorAll<HTMLElement>(
      '[role="menuitemradio"]',
    )[2]
    act(() => {
      unselected.click()
    })
    expect(onChange).toHaveBeenCalledWith("c")
    expect(host.textContent).not.toContain("Charlie")
  })

  it("closes on Escape without choosing", () => {
    const host = document.createElement("div")
    const onChange = vi.fn()
    mount(host, onChange)
    act(() => {
      host.querySelector<HTMLButtonElement>("button[type=button]")!.click()
    })
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      )
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(host.textContent).not.toContain("Charlie")
  })

  it("closes on outside click", () => {
    const host = document.createElement("div")
    mount(host)
    act(() => {
      host.querySelector<HTMLButtonElement>("button[type=button]")!.click()
    })
    expect(host.textContent).toContain("Charlie")
    act(() => {
      document.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      )
    })
    expect(host.textContent).not.toContain("Charlie")
  })
})
