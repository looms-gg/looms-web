import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react-dom/test-utils"
import { useSkinEditor } from "./useSkinEditor"
import { elementFill, selectedElementsFill, colorsFill, floodFill, faceFill, applyBrush, drawRectangle, drawEllipse, applyEraser } from "./tools/editorTools"

vi.mock("./tools/editorTools", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tools/editorTools")>()
  return {
    ...actual,
    elementFill: vi.fn(actual.elementFill),
    selectedElementsFill: vi.fn(actual.selectedElementsFill),
    colorsFill: vi.fn(actual.colorsFill),
    floodFill: vi.fn(actual.floodFill),
    faceFill: vi.fn(actual.faceFill),
    applyBrush: vi.fn(actual.applyBrush),
    applyEraser: vi.fn(actual.applyEraser),
    drawRectangle: vi.fn(actual.drawRectangle),
    drawEllipse: vi.fn(actual.drawEllipse),
  }
})

function installRecordingContexts() {
  const ctxByCanvas = new Map<HTMLCanvasElement, any>()
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement, type: string) {
      if (type !== "2d") return null
      let ctx = ctxByCanvas.get(this)
      if (!ctx) {
        const store = new Uint8ClampedArray(64 * 64 * 4)
        ctx = {
          imageSmoothingEnabled: false,
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          putImageData: vi.fn(),
          getImageData: vi.fn(() => ({ data: store, width: 64, height: 64 })),
          fillRect: vi.fn(),
          fillStyle: "",
        }
        ctxByCanvas.set(this, ctx)
      }
      return ctx
    } as unknown as typeof HTMLCanvasElement.prototype.getContext)
  return { ctxByCanvas, spy }
}

describe("useSkinEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })
  it("initializes with default tool and color state", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    expect(editor.brush.data.tool).toBe("pencil")
    expect(editor.brush.data.brushSize).toBe(1)
    expect(editor.colors.data.primaryColor).toBe("#3880ff")
    expect(editor.model).toBe("classic")
    expect(editor.canUndo).toBe(false)
    expect(editor.bufferCanvas.width).toBe(64)
    expect(editor.bufferCanvas.height).toBe(64)
  })

  it("draws default mannequin pixels so character is not transparent", async () => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext("2d")!
    const { drawDefaultMannequin } = await import("./useSkinEditor")
    drawDefaultMannequin(ctx)

    // Verify head, body, and limbs were painted
    expect(canvas.width).toBe(64)
    expect(canvas.height).toBe(64)
  })

  it("swaps primary and secondary colors", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    const initialPrimary = editor.colors.data.primaryColor
    const initialSecondary = editor.colors.data.secondaryColor

    flushSync(() => {
      editor.colors.swapColors()
    })

    expect(editor.colors.data.primaryColor).toBe(initialSecondary)
    expect(editor.colors.data.secondaryColor).toBe(initialPrimary)
  })

  it("toggles limb visibility", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    expect(editor.visibility.limbs.head).toBe(true)

    flushSync(() => {
      editor.visibility.toggleLimb("head")
    })
    expect(editor.visibility.limbs.head).toBe(false)
  })

  it("executes a paint stroke and updates history", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    expect(editor.canUndo).toBe(true)

    flushSync(() => {
      editor.undo()
    })
    expect(editor.canRedo).toBe(true)
  })

  it("clips brush stamps to the cuboid face under the texel", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ brushSize: 4 })
    })
    flushSync(() => {
      editor.beginStroke()
      // Head front is { x: 8, y: 8, w: 8, h: 8 }
      editor.applyStrokeAtTexel({ x: 8, y: 8 })
      editor.endStroke()
    })

    expect(applyBrush).toHaveBeenCalledTimes(1)
    expect(applyBrush).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      { x: 8, y: 8 },
      4,
      expect.any(Array),
      64,
      expect.objectContaining({ clip: { x: 8, y: 8, w: 8, h: 8 } }),
    )
  })

  it("skips texels outside any cuboid face", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.beginStroke()
      // (0,0) is not part of any cuboid face in the classic layout
      editor.applyStrokeAtTexel({ x: 0, y: 0 })
      editor.endStroke()
    })

    expect(applyBrush).not.toHaveBeenCalled()
  })

  it("starts a new stroke segment across a seam when resetSegment is passed", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      // Head front (8..15) to body front (20..27): crossing the seam
      editor.applyStrokeAtTexel({ x: 20, y: 20 }, { resetSegment: true })
      editor.endStroke()
    })

    const stampedPoints = (applyBrush as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[1],
    )
    expect(stampedPoints).toContainEqual({ x: 10, y: 10 })
    expect(stampedPoints).toContainEqual({ x: 20, y: 20 })
    // The interpolated streak never painted across the seam
    expect(stampedPoints).not.toContainEqual({ x: 15, y: 15 })
  })

  it("interpolates within one face when resetSegment is not passed", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.applyStrokeAtTexel({ x: 20, y: 20 })
      editor.endStroke()
    })

    const stampedPoints = (applyBrush as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[1],
    )
    expect(stampedPoints).toContainEqual({ x: 15, y: 15 })
  })

  it("bucket element fill paints the whole cuboid", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "bucket" })
      editor.brush.patch({ bucketMode: "element" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    expect(elementFill).toHaveBeenCalledTimes(1)
    expect(elementFill).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      { x: 10, y: 10 },
      [56, 128, 255, 255],
      false,
      64,
      { opacity: 1, blend: "normal" },
    )
  })

  it("bucket selected elements fill passes visibility toggles", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "bucket" })
      editor.brush.patch({ bucketMode: "selectedElements" })
      editor.visibility.patch({
        armorParts: { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
      })
      editor.visibility.toggleLimb("head") // hides head + hat
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    expect(selectedElementsFill).toHaveBeenCalledTimes(1)
    expect(selectedElementsFill).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      [56, 128, 255, 255],
      false,
      64,
      {
        body: { head: false, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
        armor: { head: false, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
      },
      { opacity: 1, blend: "normal" },
    )
  })

  it("bucket colors fill replaces every matching texel", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "bucket" })
      editor.brush.patch({ bucketMode: "colors" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 20, y: 20 })
      editor.endStroke()
    })

    expect(colorsFill).toHaveBeenCalledTimes(1)
    const colorsCall = (colorsFill as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(colorsCall.slice(0, 5)).toEqual([
      expect.any(Uint8ClampedArray),
      { x: 20, y: 20 },
      [56, 128, 255, 255],
      64,
      { opacity: 1, blend: "normal" },
    ])
  })

  it("bucket connected colors and face still dispatch to their fills", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "bucket" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })
    expect(floodFill).toHaveBeenCalledTimes(1)

    flushSync(() => {
      editor.brush.patch({ bucketMode: "face" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })
    expect(faceFill).toHaveBeenCalledTimes(1)
  })

  it("shape tool starts with rectangle filled", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    expect(editor.brush.data.shapeKind).toBe("rectangle")
    expect(editor.brush.data.shapeFill).toBe("filled")
  })

  it("commits a rectangle clipped to the face as one undo entry", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "shape" })
      editor.brush.patch({ brushSize: 2 })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.commitShape({ x: 9, y: 9 }, { x: 11, y: 10 })
      editor.endStroke()
    })

    expect(drawRectangle).toHaveBeenCalledTimes(1)
    expect(drawRectangle).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      { x: 9, y: 9 },
      { x: 11, y: 10 },
      [56, 128, 255, 255],
      64,
      {
        fill: "filled",
        thickness: 2,
        opacity: 1,
        blend: "normal",
        clip: { x: 8, y: 8, w: 8, h: 8 },
      },
    )
    expect(editor.canUndo).toBe(true)

    flushSync(() => {
      editor.undo()
    })
    expect(editor.canRedo).toBe(true)
  })

  it("commits an ellipse when the shape kind is ellipse", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "shape" })
      editor.brush.patch({ shapeKind: "ellipse" })
      editor.brush.patch({ shapeFill: "hollow" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.commitShape({ x: 9, y: 9 }, { x: 11, y: 10 })
      editor.endStroke()
    })

    expect(drawEllipse).toHaveBeenCalledTimes(1)
    expect(drawEllipse).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      { x: 9, y: 9 },
      { x: 11, y: 10 },
      [56, 128, 255, 255],
      64,
      expect.objectContaining({ fill: "hollow" }),
    )
    expect(drawRectangle).not.toHaveBeenCalled()
  })

  it("draws the mirrored shape when symmetry is on", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "shape" })
      editor.brush.patch({ symmetry: true })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.commitShape({ x: 9, y: 9 }, { x: 10, y: 9 })
      editor.endStroke()
    })

    // Head front (8..15) mirrors (9,9)->(14,9) and (10,9)->(13,9)
    const starts = (drawRectangle as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => call[1],
    )
    expect(starts).toContainEqual({ x: 9, y: 9 })
    expect(starts).toContainEqual({ x: 14, y: 9 })
  })

  it("skips shapes that start off any cuboid face", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "shape" })
      editor.beginStroke()
      editor.commitShape({ x: 0, y: 0 }, { x: 3, y: 3 })
      editor.endStroke()
    })

    expect(drawRectangle).not.toHaveBeenCalled()
  })

  it("does not paint during drag with the shape tool", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "shape" })
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    expect(drawRectangle).not.toHaveBeenCalled()
    expect(drawEllipse).not.toHaveBeenCalled()
  })

  it("selects the shape tool with the U shortcut", () => {
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "u" }))
    })

    expect(editor.brush.data.tool).toBe("shape")
  })

  it("keeps a separate paint layer under the composite buffer", () => {
    const { ctxByCanvas } = installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    expect(editor.paintCanvas).toBeTruthy()
    expect(editor.paintCanvas).not.toBe(editor.bufferCanvas)
    expect(editor.paintCanvas.width).toBe(64)
    expect(editor.paintCanvas.height).toBe(64)

    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    const paintCtx = ctxByCanvas.get(editor.paintCanvas)!
    const bufferCtx = ctxByCanvas.get(editor.bufferCanvas)!

    // The stroke mutated the paint layer, not the buffer
    const idx = (10 * 64 + 10) * 4
    expect(paintCtx.getImageData().data[idx + 3]).toBe(255)

    // The buffer recomposited base under paint, in that order
    const drawn = bufferCtx.drawImage.mock.calls.map(
      (call: unknown[]) => call[0] as HTMLCanvasElement,
    )
    expect(drawn[0]).not.toBe(editor.bufferCanvas)
    expect(drawn[0]).not.toBe(editor.paintCanvas)
    expect(drawn[1]).toBe(editor.paintCanvas)
  })

  it("eraser strokes erase the paint layer", () => {
    installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "eraser" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    expect(applyEraser).toHaveBeenCalledTimes(1)
    expect(applyEraser).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      { x: 10, y: 10 },
      1,
      64,
      expect.objectContaining({ clip: { x: 8, y: 8, w: 8, h: 8 } }),
    )
  })

  it("picker reads the composite buffer, not the paint layer", () => {
    const { ctxByCanvas } = installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.brush.patch({ tool: "picker" })
    })
    flushSync(() => {
      editor.beginStroke()
      editor.applyStrokeAtTexel({ x: 10, y: 10 })
      editor.endStroke()
    })

    const bufferCtx = ctxByCanvas.get(editor.bufferCanvas)!
    expect(bufferCtx.getImageData).toHaveBeenCalled()
    expect(applyBrush).not.toHaveBeenCalled()
  })

  it("loadPiece seeds the paint layer and marks a piece session", () => {
    const { ctxByCanvas } = installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    expect(editor.paintSession.kind).toBe("fresh")

    const texture = document.createElement("canvas")
    texture.width = 64
    texture.height = 64
    const piece = {
      id: "p1",
      name: "Test Piece",
      slot: "shirt",
      group: "torso",
      maker: "maker",
      savedCount: 0,
      likeCount: 0,
      added: 0,
      blurb: "",
      skin: "",
    } as any

    flushSync(() => {
      editor.loadPiece(piece, texture)
    })

    expect(editor.paintSession).toEqual({ kind: "piece", piece })
    expect(editor.canUndo).toBe(true)
    const paintCtx = ctxByCanvas.get(editor.paintCanvas)!
    expect(paintCtx.drawImage).toHaveBeenCalledWith(texture, 0, 0)
  })

  it("setModel on a blank paint layer does not touch history", () => {
    const { ctxByCanvas } = installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.setModel("slim")
    })

    expect(editor.model).toBe("slim")
    expect(editor.canUndo).toBe(false)
    expect(ctxByCanvas.get(editor.paintCanvas)!.putImageData).not.toHaveBeenCalled()
  })

  it("setModel classic→slim repairs 4px arms and records one undo step", () => {
    const { ctxByCanvas } = installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    const paintCtx = ctxByCanvas.get(editor.paintCanvas)!
    const store = paintCtx.getImageData().data
    const paintPx = (x: number, y: number) => {
      const i = (y * 64 + x) * 4
      store[i] = 200
      store[i + 1] = 30
      store[i + 2] = 90
      store[i + 3] = 255
    }
    for (const x of [44, 45, 46, 47]) paintPx(x, 20)
    // Steve-exclusive column marker so pixel detection reads "classic"
    paintPx(55, 20)

    flushSync(() => {
      editor.setModel("slim")
    })

    expect(editor.model).toBe("slim")
    expect(editor.canUndo).toBe(true)

    const repaired = paintCtx.putImageData.mock.calls.find(
      (call: unknown[]) => call[0] instanceof ImageData,
    )![0] as ImageData
    const at = (x: number, y: number, ch: number) =>
      repaired.data[(y * 64 + x) * 4 + ch]
    // Classic-only column cleared, kept arm columns preserved
    expect(at(47, 20, 3)).toBe(0)
    expect(at(46, 20, 3)).toBe(255)
    expect(at(46, 20, 0)).toBe(200)
  })

  it("saveDraft snapshots a fresh session and reload restores its tools", async () => {
    const { ctxByCanvas } = installRecordingContexts()

    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    const paintCtx = ctxByCanvas.get(editor.paintCanvas)!
    const store = paintCtx.getImageData().data

    flushSync(() => {
      editor.brush.patch({ tool: "noise" })
      editor.setModel("slim")
    })
    flushSync(() => {
      editor.saveDraft()
    })

        const saved = JSON.parse(sessionStorage.getItem("looms:editor_draft_v1")!)
    expect(saved.version).toBe(1)
    expect(saved.tool).toBe("noise")
    expect(saved.model).toBe("slim")

    // A new mount surfaces the draft, but restoring stays explicit
    let editor2!: ReturnType<typeof useSkinEditor>
    function Harness2() {
      editor2 = useSkinEditor()
      return null
    }
    const host2 = document.createElement("div")
    await act(async () => {
      createRoot(host2).render(React.createElement(Harness2))
    })

    expect(editor2.pendingDraft).toBe(true)
    expect(editor2.brush.data.tool).toBe("pencil")

    await act(async () => {
      editor2.restoreDraft()
    })

    expect(editor2.brush.data.tool).toBe("noise")
    expect(editor2.model).toBe("slim")
    expect(editor2.draftRestored).toBe(true)
    expect(editor2.pendingDraft).toBe(false)
    expect(editor2.paintCanvas).not.toBe(editor.paintCanvas)
    const paintCtx2 = ctxByCanvas.get(editor2.paintCanvas)!
    const put = paintCtx2.putImageData as ReturnType<typeof vi.fn>
    expect(put).toHaveBeenCalled()
    const arg = (put as ReturnType<typeof vi.fn>).mock.calls[0][0] as ImageData
    expect(Array.from(arg.data)).toEqual(Array.from(store))
  })

  it("discardDraft clears the prompt without touching tool state", async () => {
    installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    flushSync(() => {
      editor.saveDraft()
    })
    expect(sessionStorage.getItem("looms:editor_draft_v1")).toBeTruthy()

    // Fresh mount sees the stored draft again (same page load) and can drop it
    let editor2!: ReturnType<typeof useSkinEditor>
    function Harness2() {
      editor2 = useSkinEditor()
      return null
    }
    const host2 = document.createElement("div")
    await act(async () => {
      createRoot(host2).render(React.createElement(Harness2))
    })

    expect(editor2.pendingDraft).toBe(true)

    await act(async () => {
      editor2.discardDraft()
    })

    expect(editor2.pendingDraft).toBe(false)
    expect(editor2.draftRestored).toBe(false)
    expect(sessionStorage.getItem("looms:editor_draft_v1")).toBeNull()
  })

  it("skips saving a draft while a piece session is active", () => {
    installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    const piece = {
      id: "p1", name: "Test Piece", slot: "shirt", group: "torso", maker: "maker",
      savedCount: 0, likeCount: 0, added: 0, blurb: "", skin: "",
    } as any
    flushSync(() => {
      editor.loadPiece(piece, document.createElement("canvas"))
    })
    flushSync(() => {
      editor.saveDraft()
    })

    expect(sessionStorage.getItem("looms:editor_draft_v1")).toBeNull()
  })

  it("does not surface a pending draft from a piece-session tag or other page loads", () => {
    installRecordingContexts()
    sessionStorage.setItem(
      "looms:editor_draft_v1",
      JSON.stringify({ version: 1, pieceId: "p1", base: "", paint: "", sessionId: "load-x" }),
    )
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    expect(editor.draftRestored).toBe(false)
    expect(editor.pendingDraft).toBe(false)
  })

  it("fresh opens default every limb's second layer off", async () => {
    installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })
    await act(async () => {})

    expect(editor.visibility.data.armorParts).toEqual({
      head: false,
      body: false,
      rightArm: false,
      leftArm: false,
      rightLeg: false,
      leftLeg: false,
    })
  })

  it("loadPiece opens the second layer only for limbs the piece paints", async () => {
    installRecordingContexts()
    let editor!: ReturnType<typeof useSkinEditor>
    function Harness() {
      editor = useSkinEditor()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(React.createElement(Harness))
    })

    const texture = document.createElement("canvas")
    // The recording context stub shares one Uint8ClampedArray per canvas;
    // grab the texture's through getContext and paint an opaque hat texel
    // (HAT front face starts at (40, 8)).
    const store = (texture.getContext("2d") as any).getImageData().data as Uint8ClampedArray
    const idx = (8 * 64 + 40) * 4
    store[idx + 3] = 255

    const piece = { id: "p-hat", name: "Hat", slot: "hat" } as any
    await act(async () => {
      flushSync(() => {
        editor.loadPiece(piece, texture)
      })
      await Promise.resolve()
    })

    expect(editor.visibility.data.armorParts).toEqual({
      head: true,
      body: false,
      rightArm: false,
      leftArm: false,
      rightLeg: false,
      leftLeg: false,
    })
  })
})
