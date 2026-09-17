import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SaveButton } from "./SaveButton"

afterEach(() => {
  document.body.innerHTML = ""
})

function renderSave(ui: React.ReactNode) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(ui)
  })
  return host
}

const baseProps = {
  name: "Creaking Shirt",
  count: 2,
  onAdd: vi.fn(),
  onRemove: vi.fn(),
}

describe("SaveButton", () => {
  it("shows the save count as one add button when not owned", () => {
    const host = renderSave(<SaveButton {...baseProps} owned={false} />)
    const btn = host.querySelector(
      'button[aria-label="Add Creaking Shirt to wardrobe"]',
    ) as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.getAttribute("aria-pressed")).toBe("false")
    expect(btn.textContent).toMatch(/2/)
  })

  it("calls onAdd when clicked while not owned", () => {
    const onAdd = vi.fn()
    const host = renderSave(
      <SaveButton {...baseProps} owned={false} onAdd={onAdd} />,
    )
    const btn = host.querySelector("button") as HTMLButtonElement
    flushSync(() => {
      btn.click()
    })
    expect(onAdd).toHaveBeenCalledOnce()
    expect(baseProps.onRemove).not.toHaveBeenCalled()
  })

  it("arms confirm on first click when owned and removes on second", () => {
    const onRemove = vi.fn()
    const host = renderSave(
      <SaveButton {...baseProps} owned={true} onRemove={onRemove} />,
    )
    const btn = host.querySelector(
      'button[aria-label="Remove Creaking Shirt from wardrobe"]',
    ) as HTMLButtonElement
    expect(btn).toBeTruthy()
    expect(btn.getAttribute("aria-pressed")).toBe("true")

    flushSync(() => {
      btn.click()
    })
    expect(onRemove).not.toHaveBeenCalled()
    const confirm = host.querySelector(
      'button[aria-label="Confirm removing Creaking Shirt from wardrobe"]',
    ) as HTMLButtonElement
    expect(confirm).toBeTruthy()

    flushSync(() => {
      confirm.click()
    })
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it("disarms confirm on blur", () => {
    const host = renderSave(<SaveButton {...baseProps} owned={true} />)
    const btn = host.querySelector("button") as HTMLButtonElement
    flushSync(() => {
      btn.click()
    })
    expect(
      host.querySelector('button[aria-label^="Confirm removing"]'),
    ).toBeTruthy()
    flushSync(() => {
      btn.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
    })
    expect(
      host.querySelector(
        'button[aria-label="Remove Creaking Shirt from wardrobe"]',
      ),
    ).toBeTruthy()
  })
})
