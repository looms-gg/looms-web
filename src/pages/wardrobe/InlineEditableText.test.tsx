import type { ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { InlineEditableText } from "./InlineEditableText"

afterEach(() => {
  document.body.innerHTML = ""
})

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function render(ui: ReactNode) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  flushSync(() => {
    createRoot(host).render(ui)
  })
  return host
}

describe("InlineEditableText", () => {
  it("shows value and commits single-line edits on Enter", () => {
    const onCommit = vi.fn()
    const host = render(
      <InlineEditableText
        value="Rain day"
        maxLength={50}
        onCommit={onCommit}
        ariaLabel="Look name"
        editAriaLabel="Edit name"
        title="Rain day"
      />,
    )

    expect(host.querySelector("h2")?.textContent).toBe("Rain day")
    expect(host.querySelector("h2")?.getAttribute("title")).toBe("Rain day")

    flushSync(() => {
      ;(host.querySelector('button[aria-label="Edit name"]') as HTMLButtonElement).click()
    })

    const input = host.querySelector('input[aria-label="Look name"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.maxLength).toBe(50)

    flushSync(() => {
      setInputValue(input, "Sunny day")
    })
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(onCommit).toHaveBeenCalledWith("Sunny day")
    expect(host.querySelector('input[aria-label="Look name"]')).toBeNull()
  })

  it("reverts draft on Escape without committing", () => {
    const onCommit = vi.fn()
    const host = render(
      <InlineEditableText
        value="Original"
        maxLength={50}
        onCommit={onCommit}
        ariaLabel="Look name"
        editAriaLabel="Edit name"
      />,
    )

    flushSync(() => {
      ;(host.querySelector('button[aria-label="Edit name"]') as HTMLButtonElement).click()
    })
    const input = host.querySelector('input[aria-label="Look name"]') as HTMLInputElement
    flushSync(() => {
      setInputValue(input, "Changed")
    })
    flushSync(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })

    expect(onCommit).not.toHaveBeenCalled()
    expect(host.querySelector("h2")?.textContent).toBe("Original")
  })

  it("uses a textarea for multiline and commits on Enter without Shift", () => {
    const onCommit = vi.fn()
    const host = render(
      <InlineEditableText
        value=""
        maxLength={500}
        multiline
        onCommit={onCommit}
        ariaLabel="Look description"
        editAriaLabel="Edit description"
        placeholder="Add a description"
      />,
    )

    expect(host.textContent).toContain("Add a description")

    flushSync(() => {
      ;(host.querySelector('button[aria-label="Edit description"]') as HTMLButtonElement).click()
    })

    const textarea = host.querySelector(
      'textarea[aria-label="Look description"]',
    ) as HTMLTextAreaElement
    expect(textarea).not.toBeNull()
    expect(textarea.maxLength).toBe(500)

    flushSync(() => {
      setInputValue(textarea, "Soft rain layers")
    })
    flushSync(() => {
      textarea.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, shiftKey: false }),
      )
    })

    expect(onCommit).toHaveBeenCalledWith("Soft rain layers")
  })

  it("does not enter edit mode when disabled", () => {
    const onCommit = vi.fn()
    const host = render(
      <InlineEditableText
        value="Locked"
        maxLength={50}
        disabled
        onCommit={onCommit}
        ariaLabel="Look name"
        editAriaLabel="Edit name"
      />,
    )

    const editBtn = host.querySelector(
      'button[aria-label="Edit name"]',
    ) as HTMLButtonElement | null
    expect(editBtn?.disabled).toBe(true)

    flushSync(() => {
      editBtn?.click()
    })
    expect(host.querySelector('input[aria-label="Look name"]')).toBeNull()
    expect(onCommit).not.toHaveBeenCalled()
  })
})
