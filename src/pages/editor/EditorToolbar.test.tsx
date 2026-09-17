import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorToolbar } from "./EditorToolbar"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { EditorColorsState } from "./tools/useEditorColors"
import type { SkinEditorState } from "./useSkinEditor"

describe("EditorToolbar", () => {
  const mockBrush = {
    data: {
      tool: "pencil",
      gridVisible: false,
      brushSize: 1,
      shadingMode: "lighten",
      symmetry: false,
    },
    patch: vi.fn(),
  } as unknown as EditorBrushState
  const mockColors = {
    data: { primaryColor: "#ff0000" },
    setPrimaryColor: vi.fn(),
  } as unknown as EditorColorsState
  const mockEditor: Partial<SkinEditorState> = {
    model: "classic",
    setModel: vi.fn(),
    canUndo: true,
    undo: vi.fn(),
    canRedo: false,
    redo: vi.fn(),
    brush: mockBrush,
    colors: mockColors,
  }

  it("renders color swatch, eyedropper, tool buttons, undo/redo, grid, and settings", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorToolbar
          editor={mockEditor as SkinEditorState}
          uvDrawerOpen={false}
          onToggleUvDrawer={vi.fn()}
        />,
      )
    })

    expect(host.querySelector("button[aria-label='Color Picker']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Pen (P)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Eraser (E)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Bucket (B)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Shading (S)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Shape (U)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Noise (N)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Eyedropper (I)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Undo (⌘Z)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Redo (⌘⇧Z)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Toggle Grid']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Toggle 2D UV Sheet']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Settings']")).not.toBeNull()
  })

  it("selects tool directly when clicking toolbar tool buttons", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorToolbar
          editor={{ ...mockEditor, brush: { ...mockBrush, patch } } as SkinEditorState}
        />,
      )
    })

    const penBtn = host.querySelector("button[aria-label='Pen (P)']") as HTMLButtonElement
    flushSync(() => penBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "pencil" })

    const eraserBtn = host.querySelector("button[aria-label='Eraser (E)']") as HTMLButtonElement
    flushSync(() => eraserBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "eraser" })

    const bucketBtn = host.querySelector("button[aria-label='Bucket (B)']") as HTMLButtonElement
    flushSync(() => bucketBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "bucket" })

    const shadingBtn = host.querySelector("button[aria-label='Shading (S)']") as HTMLButtonElement
    flushSync(() => shadingBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "shading" })

    const shapeBtn = host.querySelector("button[aria-label='Shape (U)']") as HTMLButtonElement
    flushSync(() => shapeBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "shape" })

    const noiseBtn = host.querySelector("button[aria-label='Noise (N)']") as HTMLButtonElement
    flushSync(() => noiseBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "noise" })

    const eyedropperBtn = host.querySelector("button[aria-label='Eyedropper (I)']") as HTMLButtonElement
    flushSync(() => eyedropperBtn.click())
    expect(patch).toHaveBeenCalledWith({ tool: "picker" })
  })

  it("flips the shading mode when shading is active and clicked again", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorToolbar
          editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "shading" }, patch } } as SkinEditorState}
        />,
      )
    })
    const shadingBtn = host.querySelector("button[aria-label='Shading (S)']") as HTMLButtonElement
    flushSync(() => shadingBtn.click())
    expect(patch).toHaveBeenCalledWith({ shadingMode: "darken" })
  })

  it("triggers undo on undo click", () => {
    const undo = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorToolbar
          editor={{ ...mockEditor, canUndo: true, undo } as SkinEditorState}
        />,
      )
    })

    const undoBtn = host.querySelector("button[aria-label='Undo (⌘Z)']") as HTMLButtonElement
    flushSync(() => {
      undoBtn.click()
    })
    expect(undo).toHaveBeenCalled()
  })

  it("triggers grid toggle on grid click", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorToolbar
          editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, gridVisible: false }, patch } } as SkinEditorState}
        />,
      )
    })

    const gridBtn = host.querySelector("button[aria-label='Toggle Grid']") as HTMLButtonElement
    flushSync(() => {
      gridBtn.click()
    })
    expect(patch).toHaveBeenCalledWith({ gridVisible: true })
  })
})
