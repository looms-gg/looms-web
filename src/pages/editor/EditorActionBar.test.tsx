import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorActionBar } from "./EditorActionBar"

describe("EditorActionBar", () => {
  it("renders Editing dropdown button and Save & Export button", () => {
    const onOpenSave = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<EditorActionBar onOpenSave={onOpenSave} />)
    })

    const editingBtn = host.querySelector("button[aria-label='Mode Switcher']") as HTMLButtonElement
    const saveBtn = host.querySelector("button[aria-label='Save & Export']") as HTMLButtonElement

    expect(editingBtn).not.toBeNull()
    expect(editingBtn.textContent).toContain("Editing")
    expect(saveBtn).not.toBeNull()
    expect(saveBtn.textContent).toContain("Save & Export")
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

  it("toggles dropdown when Mode Switcher button is clicked", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<EditorActionBar onOpenSave={vi.fn()} />)
    })

    const editingBtn = host.querySelector("button[aria-label='Mode Switcher']") as HTMLButtonElement
    flushSync(() => {
      editingBtn.click()
    })

    expect(host.textContent).toContain("Studio")
  })
})
