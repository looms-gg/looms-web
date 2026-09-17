import React from "react"
import { describe, it, expect, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react"
import { EditorUvDrawer } from "./EditorUvDrawer"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { EditorColorsState } from "./tools/useEditorColors"
import type { SkinEditorState } from "./useSkinEditor"

describe("EditorUvDrawer", () => {
  it("renders 2D texture sheet with canvas and controls when open", () => {
    const fakeEditor: Partial<SkinEditorState> = {
      bufferCanvas: document.createElement("canvas"),
      model: "classic",
      brush: { data: {} } as unknown as EditorBrushState,
      colors: { data: {} } as unknown as EditorColorsState,
      subscribeTextureUpdate: () => () => {},
      beginStroke: () => {},
      applyStrokeAtTexel: () => {},
      endStroke: () => {},
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorUvDrawer, {
          editor: fakeEditor as SkinEditorState,
          open: true,
          onClose: () => {},
        }),
      )
    })

    const canvas = host.querySelector("canvas[aria-label='2D texture canvas']")
    expect(canvas).not.toBeNull()
  })

  it("renders nothing or hidden when open is false", () => {
    const fakeEditor: Partial<SkinEditorState> = {
      bufferCanvas: document.createElement("canvas"),
      model: "classic",
      brush: { data: {} } as unknown as EditorBrushState,
      colors: { data: {} } as unknown as EditorColorsState,
      subscribeTextureUpdate: () => () => {},
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorUvDrawer, {
          editor: fakeEditor as SkinEditorState,
          open: false,
          onClose: () => {},
        }),
      )
    })

    const canvas = host.querySelector("canvas[aria-label='2D texture canvas']")
    expect(canvas).toBeNull()
  })

  it("previews a shape drag on the sheet and commits once on release", async () => {
    const commitShape = vi.fn()
    const beginStroke = vi.fn()
    const endStroke = vi.fn()
    const applyStrokeAtTexel = vi.fn()
    const fakeEditor: Partial<SkinEditorState> = {
      bufferCanvas: document.createElement("canvas"),
      model: "classic",
      brush: { data: { tool: "shape", shapeKind: "rectangle" } } as unknown as EditorBrushState,
      colors: { data: { primaryColor: "#ff0000" } } as unknown as EditorColorsState,
      subscribeTextureUpdate: () => () => {},
      beginStroke,
      applyStrokeAtTexel,
      endStroke,
      commitShape,
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(EditorUvDrawer, {
          editor: fakeEditor as SkinEditorState,
          open: true,
          onClose: () => {},
        }),
      )
    })

    const canvas = host.querySelector("canvas[aria-label='2D texture canvas']") as HTMLCanvasElement
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 256,
      height: 256,
      x: 0,
      y: 0,
      right: 256,
      bottom: 256,
      toJSON: () => ({}),
    })

    const drag = async (type: string, x: number, y: number) => {
      await act(async () => {
        canvas.dispatchEvent(
          new MouseEvent(type, { button: 0, clientX: x, clientY: y, bubbles: true }),
        )
      })
    }

    // Down: snapshot only, preview visible at one texel
    await drag("pointerdown", 40, 40) // texel (10, 10)
    expect(beginStroke).toHaveBeenCalledTimes(1)
    expect(commitShape).not.toHaveBeenCalled()
    expect(host.querySelector("[data-shape-preview]")).not.toBeNull()

    // Move: preview follows the drag, nothing painted
    await drag("pointermove", 104, 104) // texel (26, 26)
    expect(applyStrokeAtTexel).not.toHaveBeenCalled()
    expect(commitShape).not.toHaveBeenCalled()
    const preview = host.querySelector("[data-shape-preview]") as HTMLElement
    expect(preview.style.left).toBe("15.625%")
    expect(preview.style.width).toBe("26.5625%")

    // Up: one commit, preview cleared
    await drag("pointerup", 104, 104)
    expect(commitShape).toHaveBeenCalledTimes(1)
    expect(commitShape).toHaveBeenCalledWith({ x: 10, y: 10 }, { x: 26, y: 26 })
    expect(endStroke).toHaveBeenCalledTimes(1)
    expect(host.querySelector("[data-shape-preview]")).toBeNull()
  })
})

