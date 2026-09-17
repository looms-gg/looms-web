import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react"
import { EditorOptionsBar } from "./EditorOptionsBar"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { SkinEditorState } from "./useSkinEditor"

describe("EditorOptionsBar", () => {
  const mockBrush = {
    data: {
      tool: "pencil",
      brushSize: 1,
      brushShape: "square",
      brushOpacity: 1,
      brushSoftness: 0,
      brushBlend: "normal",
      shadingMode: "lighten",
      bucketMode: "connectedColors",
      shapeKind: "rectangle",
      shapeFill: "filled",
      symmetry: false,
    },
    patch: vi.fn(),
  } as unknown as EditorBrushState

  const mockEditor: Partial<SkinEditorState> = {
    brush: mockBrush,
  }

  it("shows the selected tool name and brush options for the pen", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar editor={mockEditor as SkinEditorState} />,
      )
    })

    expect(host.querySelector("div[role='toolbar'][aria-label='Tool Options']")).not.toBeNull()
    expect(host.querySelector("[aria-label='Selected Tool']")?.textContent).toBe("Pen")
    expect(host.querySelector("input[aria-label='Brush Size']")).not.toBeNull()
    expect(host.querySelector("div[role='group'][aria-label='Brush Shape']")).not.toBeNull()
    expect(host.querySelector("input[aria-label='Opacity']")).not.toBeNull()
    expect(host.querySelector("input[aria-label='Softness']")).not.toBeNull()
    expect(host.querySelector("[aria-label='Blend Mode']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Toggle Symmetry']")).not.toBeNull()
    // Instant tooltips name every control for new users; hover the opacity
    // scrub field and confirm its tooltip
    act(() => {
      ;(host.querySelector("input[aria-label='Opacity']")!.closest("span") as HTMLElement).dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true }),
      )
    })
    const tip = document.querySelector("span[role='tooltip']") as HTMLElement
    expect(tip.textContent).toBe("Opacity")
    document.querySelectorAll("span[role='tooltip']").forEach((n) => n.remove())
    expect(host.querySelector("div[role='group'][aria-label='Shading Mode']")).toBeNull()
    expect(host.querySelector("div[role='group'][aria-label='Bucket Mode']")).toBeNull()
  })

  it("changes brush size by typing in the scrub field", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={{ ...mockEditor, brush: { ...mockBrush, patch } } as SkinEditorState}
        />,
      )
    })

    const sizeInput = host.querySelector("input[aria-label='Brush Size']") as HTMLInputElement
    expect(sizeInput.value).toBe("1px")

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
    descriptor?.set?.call(sizeInput, "4")
    flushSync(() => sizeInput.dispatchEvent(new Event("input", { bubbles: true })))
    flushSync(() =>
      sizeInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(patch).toHaveBeenCalledWith({ brushSize: 4 })
  })

  it("switches brush shape between square and circle", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={{ ...mockEditor, brush: { ...mockBrush, patch } } as SkinEditorState}
        />,
      )
    })

    const circleBtn = host.querySelector(
      "button[aria-label='Round Brush']",
    ) as HTMLButtonElement
    flushSync(() => circleBtn.click())
    expect(patch).toHaveBeenCalledWith({ brushShape: "circle" })

    const squareBtn = host.querySelector(
      "button[aria-label='Square Brush']",
    ) as HTMLButtonElement
    flushSync(() => squareBtn.click())
    expect(patch).toHaveBeenCalledWith({ brushShape: "square" })
  })

  it("changes opacity and softness with the scrub fields", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={
            { ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, brushOpacity: 0.5 }, patch } } as SkinEditorState
          }
        />,
      )
    })

    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")

    const opacity = host.querySelector("input[aria-label='Opacity']") as HTMLInputElement
    expect(opacity.value).toBe("50%")
    descriptor?.set?.call(opacity, "50")
    flushSync(() => opacity.dispatchEvent(new Event("input", { bubbles: true })))
    flushSync(() =>
      opacity.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(patch).toHaveBeenCalledWith({ brushOpacity: 0.5 })

    const softness = host.querySelector("input[aria-label='Softness']") as HTMLInputElement
    descriptor?.set?.call(softness, "40")
    flushSync(() => softness.dispatchEvent(new Event("input", { bubbles: true })))
    flushSync(() =>
      softness.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    )
    expect(patch).toHaveBeenCalledWith({ brushSoftness: 0.4 })
  })

  it("changes blend mode from the dropdown", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={{ ...mockEditor, brush: { ...mockBrush, patch } } as SkinEditorState}
        />,
      )
    })

    const trigger = host.querySelector("[aria-label='Blend Mode']") as HTMLElement
    act(() => {
      trigger.click()
    })
    const option = Array.from(
      host.querySelectorAll<HTMLElement>("[role='menuitemradio']"),
    ).find((el) => el.textContent?.includes("Multiply"))!
    act(() => {
      option.click()
    })
    expect(patch).toHaveBeenCalledWith({ brushBlend: "multiply" })
  })

  it("hides blend mode for tools that do not paint color", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "eraser" } } } as SkinEditorState} />,
      )
    })

    expect(host.querySelector("[aria-label='Blend Mode']")).toBeNull()
    expect(host.querySelector("div[role='group'][aria-label='Brush Shape']")).not.toBeNull()
    expect(host.querySelector("input[aria-label='Opacity']")).not.toBeNull()
  })

  it("shows shading mode buttons and switches modes when shading is active", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "shading" }, patch } } as SkinEditorState}
        />,
      )
    })

    expect(host.querySelector("[aria-label='Selected Tool']")?.textContent).toBe("Shading")
    expect(host.querySelector("div[role='group'][aria-label='Shading Mode']")).not.toBeNull()

    const darkenBtn = host.querySelector(
      "button[aria-label='Shading Darken (-)']",
    ) as HTMLButtonElement
    flushSync(() => darkenBtn.click())
    expect(patch).toHaveBeenCalledWith({ shadingMode: "darken" })

    const lightenBtn = host.querySelector(
      "button[aria-label='Shading Lighten (+)']",
    ) as HTMLButtonElement
    flushSync(() => lightenBtn.click())
    expect(patch).toHaveBeenCalledWith({ shadingMode: "lighten" })
  })

  it("shows the fill mode dropdown and hides stroke-only options when bucket is active", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "bucket" }, patch } } as SkinEditorState}
        />,
      )
    })

    expect(host.querySelector("[aria-label='Selected Tool']")?.textContent).toBe("Bucket")
    expect(host.querySelector("div[role='group'][aria-label='Bucket Mode']")).toBeNull()
    expect(host.querySelector("button[aria-label='Brush Size']")).toBeNull()
    expect(host.querySelector("input[aria-label='Softness']")).toBeNull()
    // Bucket fills honor opacity and blend
    expect(host.querySelector("input[aria-label='Opacity']")).not.toBeNull()
    expect(host.querySelector("[aria-label='Blend Mode']")).not.toBeNull()

    const trigger = host.querySelector(
      "button[aria-label='Bucket Fill Mode']",
    ) as HTMLButtonElement
    expect(trigger).not.toBeNull()
    expect(trigger.textContent).toContain("Connected Colors")

    flushSync(() => trigger.click())
    const faceOption = host.querySelector(
      "button[aria-label='Fill Mode Face']",
    ) as HTMLButtonElement
    expect(faceOption).not.toBeNull()

    flushSync(() => faceOption.click())
    expect(patch).toHaveBeenCalledWith({ bucketMode: "face" })
  })

  it("shows a hint and no options for the eyedropper", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "picker" } } } as SkinEditorState} />,
      )
    })

    expect(host.querySelector("[aria-label='Selected Tool']")?.textContent).toBe("Eyedropper")
    expect(host.querySelector("button[aria-label='Brush Size']")).toBeNull()
    expect(host.querySelector("button[aria-label='Toggle Symmetry']")).toBeNull()
    expect(host.textContent).toContain("sample a color")
  })

  it("toggles symmetry when symmetry button is clicked", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={{ ...mockEditor, brush: { ...mockBrush, patch } } as SkinEditorState}
        />,
      )
    })

    const symmetryBtn = host.querySelector(
      "button[aria-label='Toggle Symmetry']",
    ) as HTMLButtonElement
    flushSync(() => symmetryBtn.click())
    expect(patch).toHaveBeenCalledWith({ symmetry: true })
  })

  it("shows shape kind, fill, size, opacity, and blend when shape is active", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "shape" } } } as SkinEditorState} />,
      )
    })

    expect(host.querySelector("[aria-label='Selected Tool']")?.textContent).toBe("Shape")
    expect(host.querySelector("input[aria-label='Brush Size']")).not.toBeNull()
    expect(host.querySelector("input[aria-label='Softness']")).toBeNull()
    expect(host.querySelector("input[aria-label='Opacity']")).not.toBeNull()
    expect(host.querySelector("[aria-label='Blend Mode']")).not.toBeNull()
    expect(host.querySelector("div[role='group'][aria-label='Brush Shape']")).toBeNull()
  })

  it("switches shape kind between rectangle and ellipse", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={
            { ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "shape" }, patch } } as SkinEditorState
          }
        />,
      )
    })

    expect(
      host.querySelector("div[role='group'][aria-label='Shape Kind']"),
    ).not.toBeNull()

    const ellipseBtn = host.querySelector(
      "button[aria-label='Ellipse Shape']",
    ) as HTMLButtonElement
    flushSync(() => ellipseBtn.click())
    expect(patch).toHaveBeenCalledWith({ shapeKind: "ellipse" })

    const rectBtn = host.querySelector(
      "button[aria-label='Rectangle Shape']",
    ) as HTMLButtonElement
    flushSync(() => rectBtn.click())
    expect(patch).toHaveBeenCalledWith({ shapeKind: "rectangle" })
  })

  it("switches shape fill between filled and hollow", () => {
    const patch = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar
          editor={
            { ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "shape" }, patch } } as SkinEditorState
          }
        />,
      )
    })

    expect(
      host.querySelector("div[role='group'][aria-label='Shape Fill']"),
    ).not.toBeNull()

    const hollowBtn = host.querySelector(
      "button[aria-label='Hollow Outline']",
    ) as HTMLButtonElement
    flushSync(() => hollowBtn.click())
    expect(patch).toHaveBeenCalledWith({ shapeFill: "hollow" })

    const filledBtn = host.querySelector(
      "button[aria-label='Solid Fill']",
    ) as HTMLButtonElement
    flushSync(() => filledBtn.click())
    expect(patch).toHaveBeenCalledWith({ shapeFill: "filled" })
  })

  it("hides shape controls for other tools", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorOptionsBar editor={{ ...mockEditor, brush: { ...mockBrush, data: { ...mockBrush.data, tool: "pencil" } } } as SkinEditorState} />,
      )
    })

    expect(host.querySelector("div[role='group'][aria-label='Shape Kind']")).toBeNull()
    expect(host.querySelector("div[role='group'][aria-label='Shape Fill']")).toBeNull()
  })
})
