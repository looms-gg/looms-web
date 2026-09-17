import { describe, it, expect, beforeEach, vi } from "vitest"
import { paintStageFx } from "./stageFx"

// happy-dom's 2d context stub lacks the methods stageFx uses; a recording
// fake keeps the test on the real canvas size/composite logic.
const ctxCalls = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
}

beforeEach(() => {
  for (const fn of Object.values(ctxCalls)) fn.mockClear()
  const fakeCtx = {
    ...ctxCalls,
    globalCompositeOperation: "source-over",
    fillStyle: "",
  }
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    fakeCtx as unknown as CanvasRenderingContext2D,
  )
})

function makeCanvas(width: number, height: number, clientWidth = width) {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  vi.spyOn(canvas, "clientWidth", "get").mockReturnValue(clientWidth)
  return canvas
}

describe("paintStageFx", () => {
  it("defaults to full device resolution (studio behavior unchanged)", () => {
    const src = makeCanvas(600, 400)
    const shadow = document.createElement("canvas")
    const rim = document.createElement("canvas")

    paintStageFx(src, [shadow, rim], 4)

    expect(shadow.width).toBe(600)
    expect(shadow.height).toBe(400)
    expect(rim.width).toBe(600)
    expect(rim.height).toBe(400)
    // Readback scales straight into the full-res scratch.
    expect(ctxCalls.drawImage).toHaveBeenCalledWith(src, 0, 0, 600, 400)
    // Rim band erodes by -bandPx: 4 cssPx * (600/600) = 4.
    const rimBand = ctxCalls.drawImage.mock.calls.find(
      (c) => c[0] !== src && c[1] < 0,
    )
    expect(rimBand?.[1]).toBe(-4)
  })

  it("renders overlays at half resolution and converts the rim band into fx pixels", () => {
    const src = makeCanvas(600, 400, 300)
    const shadow = document.createElement("canvas")
    const rim = document.createElement("canvas")

    paintStageFx(src, [shadow, rim], 4, 0.5)

    expect(shadow.width).toBe(300)
    expect(shadow.height).toBe(200)
    expect(rim.width).toBe(300)
    expect(rim.height).toBe(200)
    expect(ctxCalls.drawImage).toHaveBeenCalledWith(src, 0, 0, 300, 200)
  })

  it("keeps the rim band readable at tiny fx scales", () => {
    const src = makeCanvas(200, 200, 100)
    const rim = document.createElement("canvas")

    paintStageFx(src, [null, rim], 4, 0.1)

    // 4 cssPx * (20/200) = 0.4 clamps up to the 2px floor.
    expect(rim.width).toBe(20)
  })
})
