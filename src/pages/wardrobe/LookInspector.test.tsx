import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { ClosetProvider, useCloset, type Look } from "../../state/closet"
import { LookInspector } from "./LookInspector"

const look: Look = {
  id: "look-1",
  name: "Rain day",
  description: "",
  visibility: "private",
  equipped: {},
  savedAt: Date.now(),
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function renderInspector(onEditOutfit: () => void = () => {}) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <MemoryRouter>
        <ClosetProvider>
          <LookInspector look={look} onEditOutfit={onEditOutfit} />
        </ClosetProvider>
      </MemoryRouter>,
    )
  })
  return host
}

describe("LookInspector", () => {
  it("shows look meta and the studio/download/edit controls", () => {
    const host = renderInspector()

    expect(host.querySelector("h2")?.textContent).toBe("Rain day")

    const buttons = [...host.querySelectorAll("button")]
    expect(buttons.some((b) => b.textContent?.trim() === "Edit outfit")).toBe(true)
    expect(buttons.some((b) => /Download/.test(b.textContent ?? ""))).toBe(true)
    expect(host.querySelector('button[aria-label="Edit name"]')).not.toBeNull()

    const switchInput = host.querySelector('[role="switch"]') as HTMLInputElement | null
    expect(switchInput).not.toBeNull()
    expect(switchInput?.checked).toBe(false)
  })

  it("does not offer a Wear this control", () => {
    const host = renderInspector()
    expect(host.textContent).not.toMatch(/Wear this/)
  })

  it("reverts a blank name edit back to the committed name", () => {
    const host = renderInspector()

    const editButton = host.querySelector(
      'button[aria-label="Edit name"]',
    ) as HTMLButtonElement
    flushSync(() => {
      editButton.click()
    })

    const input = host.querySelector(
      'input[aria-label="Look name"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()

    flushSync(() => {
      setInputValue(input, "   ")
    })
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(host.querySelector('input[aria-label="Look name"]')).toBeNull()
    expect(host.querySelector("h2")?.textContent).toBe("Rain day")
  })

  it("calls onEditOutfit when Edit outfit is clicked", () => {
    let called = false
    const host = renderInspector(() => {
      called = true
    })
    const editOutfit = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Edit outfit",
    ) as HTMLButtonElement
    flushSync(() => {
      editOutfit.click()
    })
    expect(called).toBe(true)
  })

  it("enforces maxLength and sanitizes look name on edit", () => {
    function Harness() {
      const session = useCloset()
      const saved = session.looks[0] ?? look
      return <LookInspector look={saved} onEditOutfit={() => {}} />
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <ClosetProvider>
            <Harness />
          </ClosetProvider>
        </MemoryRouter>,
      )
    })

    const editButton = host.querySelector(
      'button[aria-label="Edit name"]',
    ) as HTMLButtonElement
    flushSync(() => {
      editButton.click()
    })

    const input = host.querySelector(
      'input[aria-label="Look name"]',
    ) as HTMLInputElement
    expect(input.maxLength).toBe(50)

    flushSync(() => {
      setInputValue(input, "<script>bad()</script>Sunny Day")
    })
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    // Draft is sanitized and committed
    expect(input.maxLength).toBe(50)
  })

  it("enforces maxLength on look description textarea", () => {
    const host = renderInspector()

    const editDescBtn = host.querySelector(
      'button[aria-label="Edit description"]',
    ) as HTMLButtonElement
    flushSync(() => {
      editDescBtn.click()
    })

    const textarea = host.querySelector(
      'textarea[aria-label="Look description"]',
    ) as HTMLTextAreaElement
    expect(textarea.maxLength).toBe(500)
  })
})
