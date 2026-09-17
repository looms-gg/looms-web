import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  DRAFT_SESSION_ID,
  EDITOR_DRAFT_KEY,
  clearEditorDraft,
  readEditorDraft,
  restoreCanvasFromBase64,
  saveEditorDraft,
} from "./editorDraft"

function stubCanvas(fill?: (data: Uint8ClampedArray) => void) {
  const store = new Uint8ClampedArray(64 * 64 * 4)
  const ctx = {
    clearRect: vi.fn(),
    putImageData: vi.fn(),
    getImageData: () => ({ data: store, width: 64, height: 64 }),
  }
  if (fill) fill(store)
  const canvas = {
    getContext: () => ctx,
    width: 64,
    height: 64,
  } as unknown as HTMLCanvasElement
  return { canvas, ctx, store }
}

function makeCanvas(fill?: (data: Uint8ClampedArray) => void) {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (ctx && fill) {
    const img = ctx.getImageData(0, 0, 64, 64)
    fill(img.data)
    ctx.putImageData(img, 0, 0)
  }
  return canvas
}

function bytesToBase64(bytes: Uint8Array | Uint8ClampedArray) {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
const toBase64 = bytesToBase64

function baseDraft(overrides: Record<string, unknown> = {}) {
  return {
    model: "slim" as const,
    tool: "pencil" as const,
    brushSize: 3,
    brushShape: "circle" as const,
    brushOpacity: 0.8,
    brushSoftness: 0.2,
    brushBlend: "multiply" as const,
    shadingMode: "darken" as const,
    bucketMode: "element" as const,
    shapeKind: "ellipse" as const,
    shapeFill: "hollow" as const,
    symmetry: true,
    primaryColor: "#ff0000",
    secondaryColor: "#00ff00",
    recentColors: ["#ff0000", "#0000ff"],
    bodyParts: { head: false, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true },
    armorParts: { head: true, body: true, rightArm: false, leftArm: true, rightLeg: true, leftLeg: true },
    gridVisible: false,
    ...overrides,
  }
}

describe("editorDraft", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it("round-trips canvas pixels and control state through sessionStorage", () => {
    const baseRaw = stubCanvas((data) => {
      data[0] = 200
      data[1] = 30
      data[2] = 90
      data[3] = 255
    })
    const paintRaw = stubCanvas((data) => {
      const idx = (20 * 64 + 30) * 4
      data[idx + 3] = 255
    })
    const base = baseRaw.canvas
    const paint = paintRaw.canvas

    saveEditorDraft({
      ...baseDraft(),
      baseCanvas: base,
      paintCanvas: paint,
    })

    expect(sessionStorage.getItem(EDITOR_DRAFT_KEY)).toBeTruthy()

    const draft = readEditorDraft()
    expect(draft?.tool).toBe("pencil")
    expect(draft?.model).toBe("slim")
    expect(draft?.recentColors).toEqual(["#ff0000", "#0000ff"])

    expect(draft!.paint).toBe(toBase64(paintRaw.store))

    const putCalls: ImageData[] = []
    const fakeCtx = {
      clearRect: vi.fn(),
      putImageData: (img: ImageData) => putCalls.push(img),
    }
    const fakeCanvas = { getContext: () => fakeCtx } as unknown as HTMLCanvasElement
    expect(restoreCanvasFromBase64(fakeCanvas, draft!.paint)).toBe(true)
    expect(putCalls).toHaveLength(1)
    expect(putCalls[0].width).toBe(64)
    expect(putCalls[0].height).toBe(64)
    expect(putCalls[0].data[(20 * 64 + 30) * 4 + 3]).toBe(255)
    expect(putCalls[0].data[3]).toBe(0)
  })

  it("rejects malformed, wrong-version, and piece drafts", () => {
    sessionStorage.setItem(EDITOR_DRAFT_KEY, "not json")
    expect(readEditorDraft()).toBeNull()

    let data = JSON.stringify({ version: 0 })
    sessionStorage.setItem(EDITOR_DRAFT_KEY, data)
    expect(readEditorDraft()).toBeNull()

    data = JSON.stringify({ version: 1, pieceId: "p1", base: "", paint: "" })
    sessionStorage.setItem(EDITOR_DRAFT_KEY, data)
    expect(readEditorDraft()).toBeNull()

    data = JSON.stringify({ version: 1, base: "", paint: "!!!" })
    sessionStorage.setItem(EDITOR_DRAFT_KEY, data)
    expect(readEditorDraft()).toBeNull()
  })

  it("clamps and falls back on hostile state values", () => {
    sessionStorage.setItem(
      EDITOR_DRAFT_KEY,
      JSON.stringify(
        { version: 1, pieceId: null, sessionId: DRAFT_SESSION_ID, ...baseDraft({
          base: toBase64(new Uint8ClampedArray(64 * 64 * 4)),
          paint: toBase64(new Uint8ClampedArray(64 * 64 * 4)),
          model: "hack",
          tool: "explode",
          brushSize: 99,
          brushOpacity: 42,
          primaryColor: "javascript:",
          recentColors: ["bad", "#123456"],
          bucketMode: "memo",
        }) },
      ),
    )

    const draft = readEditorDraft()
    expect(draft).not.toBeNull()
    expect(draft!.model).toBe("classic")
    expect(draft!.tool).toBe("pencil")
    expect(draft!.brushSize).toBe(4)
    expect(draft!.brushOpacity).toBe(1)
    expect(draft!.primaryColor).toBe("#3880ff")
    expect(draft!.recentColors).toEqual(["#123456"])
    expect(draft!.bucketMode).toBe("connectedColors")
    expect(Object.values(draft!.bodyParts).every((v) => typeof v === "boolean")).toBe(true)
  })

  it("clears the stored draft", () => {
    const paint = makeCanvas()
    saveEditorDraft({ ...baseDraft(), baseCanvas: makeCanvas(), paintCanvas: paint })
    expect(sessionStorage.getItem(EDITOR_DRAFT_KEY)).toBeTruthy()
    clearEditorDraft()
    expect(readEditorDraft()).toBeNull()
  })

  it("rejects and clears a draft from a previous page load", () => {
    sessionStorage.setItem(
      EDITOR_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        pieceId: null,
        sessionId: "load-stale",
        base: toBase64(new Uint8ClampedArray(64 * 64 * 4)),
        paint: toBase64(new Uint8ClampedArray(64 * 64 * 4)),
      }),
    )
    expect(readEditorDraft()).toBeNull()
    expect(sessionStorage.getItem(EDITOR_DRAFT_KEY)).toBeNull()
  })
})
