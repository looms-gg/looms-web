import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { BrushFlyout } from "./BrushFlyout"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { SkinEditorState } from "./useSkinEditor"

describe("BrushFlyout", () => {
  it("renders the active tool button trigger", () => {
    const mockEditor: Partial<SkinEditorState> = {
      brush: {
        data: { tool: "pencil", brushSize: 1, shadingMode: "lighten", symmetry: false },
        patch: vi.fn(),
      } as unknown as EditorBrushState,
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<BrushFlyout editor={mockEditor as SkinEditorState} />)
    })

    const trigger = host.querySelector("button[aria-label='Brush Tools']") as HTMLButtonElement
    expect(trigger).not.toBeNull()
  })

  it("opens flyout when clicked and switches tools", () => {
    const patch = vi.fn()
    const mockEditor: Partial<SkinEditorState> = {
      brush: {
        data: { tool: "pencil", brushSize: 1, shadingMode: "lighten", symmetry: false },
        patch,
      } as unknown as EditorBrushState,
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<BrushFlyout editor={mockEditor as SkinEditorState} />)
    })

    const trigger = host.querySelector("button[aria-label='Brush Tools']") as HTMLButtonElement
    flushSync(() => {
      trigger.click()
    })

    const eraserBtn = host.querySelector("button[aria-label='Eraser (E)']") as HTMLButtonElement
    expect(eraserBtn).not.toBeNull()

    flushSync(() => {
      eraserBtn.click()
    })
    expect(patch).toHaveBeenCalledWith({ tool: "eraser" })
  })

  it("toggles symmetry when symmetry button is clicked", () => {
    const patch = vi.fn()
    const mockEditor: Partial<SkinEditorState> = {
      brush: {
        data: { tool: "pencil", brushSize: 1, shadingMode: "lighten", symmetry: false },
        patch,
      } as unknown as EditorBrushState,
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<BrushFlyout editor={mockEditor as SkinEditorState} />)
    })

    const trigger = host.querySelector("button[aria-label='Brush Tools']") as HTMLButtonElement
    flushSync(() => {
      trigger.click()
    })

    const symmetryBtn = host.querySelector("button[aria-label='Toggle Symmetry']") as HTMLButtonElement
    expect(symmetryBtn).not.toBeNull()

    flushSync(() => {
      symmetryBtn.click()
    })
    expect(patch).toHaveBeenCalledWith({ symmetry: true })
  })
})
