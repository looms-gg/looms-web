import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorActionBar, EDITOR_KEYBIND_TIPS } from "./EditorActionBar"

describe("EditorActionBar", () => {
  it("renders the Save & Export button and the keybind tips", () => {
    const onOpenSave = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<EditorActionBar onOpenSave={onOpenSave} />)
    })

    const saveBtn = host.querySelector("button[aria-label='Save & Export']") as HTMLButtonElement

    expect(saveBtn).not.toBeNull()
    expect(saveBtn.textContent).toContain("Save & Export")
    for (const tip of EDITOR_KEYBIND_TIPS) {
      expect(host.textContent).toContain(tip.text)
    }
  })

  it("has no mode switcher", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<EditorActionBar onOpenSave={vi.fn()} />)
    })

    expect(host.querySelector("button[aria-label='Mode Switcher']")).toBeNull()
    expect(host.textContent).not.toContain("Editing")
    expect(host.textContent).not.toContain("Studio")
  })

  it("calls onOpenSave when Save & Export is clicked", () => {
    const onOpenSave = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<EditorActionBar onOpenSave={onOpenSave} />)
    })

    const saveBtn = host.querySelector("button[aria-label='Save & Export']") as HTMLButtonElement
    flushSync(() => {
      saveBtn.click()
    })
    expect(onOpenSave).toHaveBeenCalled()
  })
})
