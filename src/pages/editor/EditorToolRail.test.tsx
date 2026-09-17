import React from "react"
import { describe, it, expect } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorToolRail } from "./EditorToolRail"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { EditorTool, ShapeKind } from "./tools/editorControls"
import type { ShapeFillMode } from "./tools/editorTools"
import type { EditorColorsState } from "./tools/useEditorColors"
import type { BucketMode } from "./tools/editorTools"
import type { SkinEditorState } from "./useSkinEditor"

describe("EditorToolRail", () => {
  it("switches tools when clicked", () => {
    let activeTool = "pencil"
    const fakeEditor: Partial<SkinEditorState> = {
      brush: {
        data: {
          tool: activeTool as any,
          brushSize: 1,
          shadingMode: "lighten",
          bucketMode: "connectedColors",
          symmetry: false,
        },
        patch: (p: Partial<{ tool: EditorTool }>) => {
          if (p.tool !== undefined) activeTool = p.tool
        },
      } as unknown as EditorBrushState,
      colors: {
        data: { primaryColor: "#ff0000", secondaryColor: "#000000", recentColors: ["#ff0000", "#00ff00"] },
        setPrimaryColor: () => {},
        setSecondaryColor: () => {},
        swapColors: () => {},
      } as unknown as EditorColorsState,
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorToolRail, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    const eraserBtn = host.querySelector("button[aria-label='Eraser']") as HTMLButtonElement
    expect(eraserBtn).not.toBeNull()

    flushSync(() => {
      eraserBtn.click()
    })

    expect(activeTool).toBe("eraser")
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
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorToolRail, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    const trigger = host.querySelector(
      "button[aria-label='Bucket Fill Mode']",
    ) as HTMLButtonElement
    expect(trigger).not.toBeNull()
    expect(trigger.textContent).toContain("Connected Colors")

    flushSync(() => {
      trigger.click()
    })

    const faceOption = host.querySelector(
      "button[aria-label='Fill Mode Face']",
    ) as HTMLButtonElement
    expect(faceOption).not.toBeNull()

    flushSync(() => {
      faceOption.click()
    })
    expect(bucketMode).toBe("face")
    expect(host.querySelector("button[aria-label='Fill Mode Face']")).toBeNull()
  })

  it("switches to the shape tool and shows its sub-options when active", () => {
    let activeTool: string = "pencil"
    let shapeKind: string = "rectangle"
    let shapeFill: string = "filled"
    const fakeEditor: Partial<SkinEditorState> = {
      brush: {
        data: {
          tool: activeTool as any,
          brushSize: 1,
          shadingMode: "lighten",
          bucketMode: "connectedColors",
          shapeKind: shapeKind as any,
          shapeFill: shapeFill as any,
          symmetry: false,
        },
        patch: (p: Partial<{ tool: EditorTool; shapeKind: ShapeKind; shapeFill: ShapeFillMode }>) => {
          if (p.tool !== undefined) activeTool = p.tool
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
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorToolRail, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    const shapeBtn = host.querySelector("button[aria-label='Shape']") as HTMLButtonElement
    expect(shapeBtn).not.toBeNull()
    flushSync(() => shapeBtn.click())
    expect(activeTool).toBe("shape")

    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorToolRail, {
          editor: { ...fakeEditor, brush: { ...fakeEditor.brush!, data: { ...fakeEditor.brush!.data, tool: "shape" } } } as SkinEditorState,
        }),
      )
    })
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

