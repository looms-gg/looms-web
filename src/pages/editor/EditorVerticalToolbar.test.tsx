import React from "react"
import { describe, it, expect } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorVerticalToolbar } from "./EditorVerticalToolbar"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { EditorTool, ShapeKind } from "./tools/editorControls"
import type { ShapeFillMode } from "./tools/editorTools"
import type { EditorColorsState } from "./tools/useEditorColors"
import type { BucketMode } from "./tools/editorTools"
import type { SkinEditorState } from "./useSkinEditor"

describe("EditorVerticalToolbar", () => {
  it("renders Bridge toolbar with tool buttons, color swatches, brush size, symmetry, grid, and undo/redo", () => {
    let activeTool = "pencil"
    let brushSize = 1
    let symmetry = false
    let gridVisible = true
    let primaryColor = "#ff0000"
    let secondaryColor = "#000000"
    let swapped = false

    const fakeEditor: Partial<SkinEditorState> = {
      brush: {
        data: {
          tool: activeTool as any,
          brushSize,
          shadingMode: "lighten",
          bucketMode: "connectedColors",
          symmetry,
          gridVisible,
        },
        patch: (p: Partial<{ tool: EditorTool; brushSize: number; symmetry: boolean; gridVisible: boolean }>) => {
          if (p.tool !== undefined) activeTool = p.tool
          if (p.brushSize !== undefined) brushSize = p.brushSize
          if (p.symmetry !== undefined) symmetry = p.symmetry
          if (p.gridVisible !== undefined) gridVisible = p.gridVisible
        },
      } as unknown as EditorBrushState,
      colors: {
        data: { primaryColor, secondaryColor, recentColors: [] },
        setPrimaryColor: (c: string) => {
          primaryColor = c
        },
        setSecondaryColor: (c: string) => {
          secondaryColor = c
        },
        swapColors: () => {
          swapped = true
        },
      } as unknown as EditorColorsState,
      canUndo: true,
      canRedo: false,
      undo: () => {},
      redo: () => {},
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorVerticalToolbar, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    const pencilBtn = host.querySelector("button[aria-label='Pen']") as HTMLButtonElement
    const eraserBtn = host.querySelector("button[aria-label='Eraser']") as HTMLButtonElement
    const bucketBtn = host.querySelector("button[aria-label='Bucket']") as HTMLButtonElement
    const swapBtn = host.querySelector("button[title='Swap Colors (X)']") as HTMLButtonElement
    const brush2Btn = host.querySelector("button[title='2px Brush']") as HTMLButtonElement

    expect(pencilBtn).not.toBeNull()
    expect(eraserBtn).not.toBeNull()
    expect(bucketBtn).not.toBeNull()
    expect(swapBtn).not.toBeNull()
    expect(brush2Btn).not.toBeNull()

    flushSync(() => {
      eraserBtn.click()
    })
    expect(activeTool).toBe("eraser")

    flushSync(() => {
      swapBtn.click()
    })
    expect(swapped).toBe(true)

    flushSync(() => {
      brush2Btn.click()
    })
    expect(brushSize).toBe(2)
  })

  it("opens the fill mode dropdown and switches modes when bucket is active", () => {
    let bucketMode: "connectedColors" | "face" = "connectedColors"
    const fakeEditor: Partial<SkinEditorState> = {
      brush: {
        data: {
          tool: "bucket" as any,
          brushSize: 1,
          shadingMode: "lighten",
          bucketMode,
          symmetry: false,
          gridVisible: true,
        },
        patch: (p: Partial<{ bucketMode: BucketMode }>) => {
          if (p.bucketMode !== undefined) bucketMode = p.bucketMode as any
        },
      } as unknown as EditorBrushState,
      colors: {
        data: { primaryColor: "#ff0000", secondaryColor: "#000000", recentColors: [] },
        setPrimaryColor: () => {},
        setSecondaryColor: () => {},
        swapColors: () => {},
      } as unknown as EditorColorsState,
      canUndo: true,
      canRedo: false,
      undo: () => {},
      redo: () => {},
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorVerticalToolbar, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    const trigger = host.querySelector(
      "button[aria-label='Bucket Fill Mode']",
    ) as HTMLButtonElement
    expect(trigger).not.toBeNull()

    flushSync(() => {
      trigger.click()
    })

    const elementOption = host.querySelector(
      "button[aria-label='Fill Mode Element']",
    ) as HTMLButtonElement
    expect(elementOption).not.toBeNull()

    flushSync(() => {
      elementOption.click()
    })
    expect(bucketMode).toBe("element")
  })

  it("shows the shape tool with kind and fill toggles when active", () => {
    let shapeKind: string = "rectangle"
    let shapeFill: string = "filled"
    const fakeEditor: Partial<SkinEditorState> = {
      brush: {
        data: {
          tool: "shape" as any,
          brushSize: 1,
          shadingMode: "lighten",
          bucketMode: "connectedColors",
          shapeKind: shapeKind as any,
          shapeFill: shapeFill as any,
          symmetry: false,
          gridVisible: true,
        },
        patch: (p: Partial<{ shapeKind: ShapeKind; shapeFill: ShapeFillMode }>) => {
          if (p.shapeKind !== undefined) shapeKind = p.shapeKind
          if (p.shapeFill !== undefined) shapeFill = p.shapeFill
        },
      } as unknown as EditorBrushState,
      colors: {
        data: { primaryColor: "#ff0000", secondaryColor: "#000000", recentColors: [] },
        setPrimaryColor: () => {},
        setSecondaryColor: () => {},
        swapColors: () => {},
      } as unknown as EditorColorsState,
      canUndo: true,
      canRedo: false,
      undo: () => {},
      redo: () => {},
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorVerticalToolbar, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    expect(host.querySelector("button[aria-label='Shape']")).not.toBeNull()
    expect(
      host.querySelector("div[role='group'][aria-label='Shape Kind']"),
    ).not.toBeNull()
    expect(
      host.querySelector("div[role='group'][aria-label='Shape Fill']"),
    ).not.toBeNull()

    const ellipseBtn = host.querySelector(
      "button[aria-label='Ellipse Shape']",
    ) as HTMLButtonElement
    flushSync(() => ellipseBtn.click())
    expect(shapeKind).toBe("ellipse")

    const hollowBtn = host.querySelector(
      "button[aria-label='Hollow Outline']",
    ) as HTMLButtonElement
    flushSync(() => hollowBtn.click())
    expect(shapeFill).toBe("hollow")
  })
})

