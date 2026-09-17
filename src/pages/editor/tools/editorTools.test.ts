import { describe, it, expect } from "vitest"
import {
  hexToRgba,
  rgbaToHex,
  setPixel,
  getPixel,
  applyBrush,
  applyEraser,
  applyShading,
  applyColorJitter,
  floodFill,
  faceFill,
  elementFill,
  selectedElementsFill,
  colorsFill,
  drawRectangle,
  drawEllipse,
} from "./editorTools"
describe("editorTools", () => {
  it("converts hex to rgba and back", () => {
    expect(hexToRgba("#ff0000")).toEqual([255, 0, 0, 255])
    expect(hexToRgba("#00ff00aa")).toEqual([0, 255, 0, 170])
    expect(rgbaToHex(0, 255, 0)).toBe("#00ff00")
  })

  it("applies brush stamp with sizes 1, 2, 3", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const points1 = applyBrush(buffer, { x: 10, y: 10 }, 1, [255, 0, 0, 255])
    expect(points1).toHaveLength(1)
    expect(getPixel(buffer, 10, 10)).toEqual([255, 0, 0, 255])

    const points2 = applyBrush(buffer, { x: 20, y: 20 }, 2, [0, 255, 0, 255])
    expect(points2).toHaveLength(4)
    expect(getPixel(buffer, 20, 20)).toEqual([0, 255, 0, 255])
    expect(getPixel(buffer, 21, 21)).toEqual([0, 255, 0, 255])

    const points3 = applyBrush(buffer, { x: 30, y: 30 }, 3, [0, 0, 255, 255])
    expect(points3).toHaveLength(9)
  })

  it("erases pixels to alpha 0", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [100, 100, 100, 255])
    applyEraser(buffer, { x: 5, y: 5 }, 1)
    expect(getPixel(buffer, 5, 5)[3]).toBe(0)
  })

  it("clips brush stamps to the face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    // Head front is { x: 8, y: 8, w: 8, h: 8 }; size 4 at (8,8) bleeds to 7..10
    const modified = applyBrush(
      buffer,
      { x: 8, y: 8 },
      4,
      [255, 0, 0, 255],
      64,
      { clip: { x: 8, y: 8, w: 8, h: 8 } },
    )
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 7, 8)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 8, 7)).toEqual([0, 0, 0, 0])
    for (const pt of modified) {
      expect(pt.x).toBeGreaterThanOrEqual(8)
      expect(pt.x).toBeLessThan(16)
      expect(pt.y).toBeGreaterThanOrEqual(8)
      expect(pt.y).toBeLessThan(16)
    }
  })

  it("clips circle brush stamps to the face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    applyBrush(
      buffer,
      { x: 8, y: 8 },
      4,
      [255, 0, 0, 255],
      64,
      { shape: "circle", clip: { x: 8, y: 8, w: 8, h: 8 } },
    )
    expect(getPixel(buffer, 7, 8)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
  })

  it("clips eraser stamps to the face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 7, 8, [100, 100, 100, 255])
    setPixel(buffer, 8, 8, [100, 100, 100, 255])
    applyEraser(buffer, { x: 8, y: 8 }, 3, 64, { clip: { x: 8, y: 8, w: 8, h: 8 } })
    expect(getPixel(buffer, 7, 8)[3]).toBe(255)
    expect(getPixel(buffer, 8, 8)[3]).toBe(0)
  })

  it("clips shading stamps to the face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 7, 8, [100, 100, 100, 255])
    setPixel(buffer, 8, 8, [100, 100, 100, 255])
    applyShading(buffer, { x: 8, y: 8 }, 3, "lighten", 0.1, 64, {
      clip: { x: 8, y: 8, w: 8, h: 8 },
    })
    expect(getPixel(buffer, 7, 8)[0]).toBe(100)
    expect(getPixel(buffer, 8, 8)[0]).toBeGreaterThan(100)
  })

  it("lightens and darkens pixels with shading tool without touching transparent pixels", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 8, 8, [100, 100, 100, 255])
    applyShading(buffer, { x: 8, y: 8 }, 1, "lighten", 0.1)
    const lightened = getPixel(buffer, 8, 8)
    expect(lightened[0]).toBeGreaterThan(100)

    applyShading(buffer, { x: 8, y: 8 }, 1, "darken", 0.1)
    const darkened = getPixel(buffer, 8, 8)
    expect(darkened[0]).toBeLessThan(lightened[0])

    // Transparent pixel untouched
    applyShading(buffer, { x: 0, y: 0 }, 1, "lighten", 0.1)
    expect(getPixel(buffer, 0, 0)[3]).toBe(0)
  })

  it("applies subtle jitter/noise to a color", () => {
    const original = "#808080"
    const jittered = applyColorJitter(original, 0.08)
    expect(jittered).toMatch(/^#[0-9a-f]{6}$/i)
    // May vary slightly
    expect(jittered.length).toBe(7)
  })

  it("flood fills contiguous pixels", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 1, 1, [255, 255, 255, 255])
    setPixel(buffer, 1, 2, [255, 255, 255, 255])
    setPixel(buffer, 2, 2, [255, 255, 255, 255])
    floodFill(buffer, { x: 1, y: 1 }, [255, 0, 0, 255])
    expect(getPixel(buffer, 1, 1)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 1, 2)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 2, 2)).toEqual([255, 0, 0, 255])
  })

  it("face fills entire cuboid face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    // Head front is { x: 8, y: 8, w: 8, h: 8 }
    faceFill(buffer, { x: 10, y: 10 }, [0, 0, 255, 255])
    expect(getPixel(buffer, 8, 8)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 15, 15)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 7, 7)).toEqual([0, 0, 0, 0])
  })

  it("element fills every face of the clicked cuboid", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    elementFill(buffer, { x: 10, y: 10 }, [0, 0, 255, 255])
    // Head top, front, and back faces all get painted
    expect(getPixel(buffer, 8, 0)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 31, 15)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 8, 8)).toEqual([0, 0, 255, 255])
    // Corner outside the head UV footprint and body top stay untouched
    expect(getPixel(buffer, 0, 0)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 20, 16)).toEqual([0, 0, 0, 0])
  })

  it("element fill falls back to flood fill off the UV layout", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 63, 63, [255, 255, 255, 255])
    setPixel(buffer, 62, 63, [255, 255, 255, 255])
    elementFill(buffer, { x: 63, y: 63 }, [0, 255, 0, 255])
    expect(getPixel(buffer, 63, 63)).toEqual([0, 255, 0, 255])
    expect(getPixel(buffer, 62, 63)).toEqual([0, 255, 0, 255])
  })

  it("selected elements fill respects body and armor toggles", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const enabled = {
      body: { head: true, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false },
      armor: { head: false, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false },
    }
    selectedElementsFill(buffer, [0, 0, 255, 255], false, 64, enabled)
    expect(getPixel(buffer, 8, 8)).toEqual([0, 0, 255, 255]) // head front
    expect(getPixel(buffer, 44, 10)).toEqual([0, 0, 0, 0]) // hat front blocked
    expect(getPixel(buffer, 20, 20)).toEqual([0, 0, 0, 0]) // body front blocked
  })

  it("selected elements fill fills outer layers via armor toggles", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const enabled = {
      body: { head: false, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false },
      armor: { head: true, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false },
    }
    selectedElementsFill(buffer, [0, 0, 255, 255], false, 64, enabled)
    expect(getPixel(buffer, 44, 10)).toEqual([0, 0, 255, 255]) // hat front
    expect(getPixel(buffer, 8, 8)).toEqual([0, 0, 0, 0]) // head blocked
    expect(getPixel(buffer, 20, 36)).toEqual([0, 0, 0, 0]) // jacket front blocked
  })

  it("colors fill replaces every matching texel across the whole atlas", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 1, 1, [255, 0, 0, 255])
    setPixel(buffer, 30, 30, [255, 0, 0, 255])
    setPixel(buffer, 50, 50, [255, 0, 0, 255])
    setPixel(buffer, 2, 2, [255, 255, 255, 255])
    colorsFill(buffer, { x: 1, y: 1 }, [0, 0, 255, 255])
    expect(getPixel(buffer, 1, 1)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 30, 30)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 50, 50)).toEqual([0, 0, 255, 255])
    expect(getPixel(buffer, 2, 2)).toEqual([255, 255, 255, 255])
  })

  it("colors fill ignores out-of-bounds starts", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    expect(colorsFill(buffer, { x: 64, y: 0 }, [0, 0, 255, 255])).toEqual([])
    expect(colorsFill(buffer, { x: 0, y: -1 }, [0, 0, 255, 255])).toEqual([])
  })

  it("flood fill honors opacity over opaque and transparent pixels", () => {
    const overOpaque = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(overOpaque, 5, 5, [0, 0, 0, 255])
    setPixel(overOpaque, 5, 6, [0, 0, 0, 255])
    floodFill(overOpaque, { x: 5, y: 5 }, [255, 0, 0, 255], 64, { opacity: 0.5 })
    const opaque = getPixel(overOpaque, 5, 5)
    expect(opaque[3]).toBe(255)
    expect(opaque[0]).toBeCloseTo(128, 0)

    const overTransparent = new Uint8ClampedArray(64 * 64 * 4)
    floodFill(overTransparent, { x: 5, y: 5 }, [255, 0, 0, 255], 64, { opacity: 0.5 })
    expect(getPixel(overTransparent, 5, 5)[3]).toBe(128)
  })

  it("flood fill blends with the destination using blend modes", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [200, 100, 50, 255])
    setPixel(buffer, 6, 5, [200, 100, 50, 255])
    floodFill(buffer, { x: 5, y: 5 }, [255, 255, 255, 255], 64, { blend: "multiply" })
    expect(getPixel(buffer, 5, 5)).toEqual([200, 100, 50, 255])
  })

  it("fills still apply when the fill color matches but opacity or blend differ", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [0, 0, 0, 255])
    setPixel(buffer, 5, 6, [10, 10, 10, 255])
    const touched = floodFill(buffer, { x: 5, y: 5 }, [0, 0, 0, 255], 64, { opacity: 0.5 })
    expect(touched.length).toBeGreaterThan(0)
    expect(getPixel(buffer, 5, 5)[3]).toBe(255) // opaque dst stays opaque
  })

  it("plain fills onto an identical color short-circuit without changes", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [255, 0, 0, 255])
    setPixel(buffer, 6, 5, [255, 0, 0, 255])
    const touched = floodFill(buffer, { x: 5, y: 5 }, [255, 0, 0, 255])
    expect(touched).toEqual([])
  })

  it("stamps a smaller circle than square for size 3", () => {
    const square = applyBrush(
      new Uint8ClampedArray(64 * 64 * 4),
      { x: 10, y: 10 },
      3,
      [255, 0, 0, 255],
      64,
      { shape: "square" },
    )
    const circle = applyBrush(
      new Uint8ClampedArray(64 * 64 * 4),
      { x: 10, y: 10 },
      3,
      [255, 0, 0, 255],
      64,
      { shape: "circle" },
    )
    // Square 3x3 = 9; circle drops the four corners -> plus shape = 5
    expect(square).toHaveLength(9)
    expect(circle).toHaveLength(5)
  })

  it("larger sizes produce larger stamps", () => {
    const b3 = applyBrush(new Uint8ClampedArray(64 * 64 * 4), { x: 10, y: 10 }, 3, [255, 0, 0, 255])
    const b5 = applyBrush(new Uint8ClampedArray(64 * 64 * 4), { x: 10, y: 10 }, 5, [255, 0, 0, 255])
    expect(b3.length).toBeLessThan(b5.length)
  })

  it("paints with reduced alpha when opacity is below 100%", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [0, 0, 0, 255])
    applyBrush(buffer, { x: 5, y: 5 }, 1, [255, 0, 0, 255], 64, { opacity: 0.5 })
    const px = getPixel(buffer, 5, 5)
    expect(px[3]).toBe(255) // over opaque dst, result stays opaque
    expect(px[0]).toBeCloseTo(128, 0) // halfway blend toward red

    const fresh = new Uint8ClampedArray(64 * 64 * 4)
    applyBrush(fresh, { x: 5, y: 5 }, 1, [255, 0, 0, 255], 64, { opacity: 0.5 })
    expect(getPixel(fresh, 5, 5)[3]).toBe(128)
  })

  it("soft edges get reduced coverage than the center", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    // Soft square size 5: center (10,10) full, inner ring (10,9) fades, box edge (10,8) drops out
    applyBrush(buffer, { x: 10, y: 10 }, 5, [255, 0, 0, 255], 64, {
      opacity: 1,
      softness: 1,
    })
    const center = getPixel(buffer, 10, 10)
    const ring = getPixel(buffer, 10, 9)
    const edge = getPixel(buffer, 10, 8)
    expect(center[3]).toBe(255)
    expect(ring[3]).toBeGreaterThan(0)
    expect(ring[3]).toBeLessThan(255)
    expect(edge[3]).toBe(0)
  })

  it("blends brush color with the destination using blend modes", () => {
    const multiply = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(multiply, 5, 5, [200, 100, 50, 255])
    applyBrush(multiply, { x: 5, y: 5 }, 1, [255, 255, 255, 255], 64, { blend: "multiply" })
    // 200 * 255 / 255 = 200
    expect(getPixel(multiply, 5, 5)).toEqual([200, 100, 50, 255])

    const screen = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(screen, 5, 5, [100, 100, 100, 255])
    applyBrush(screen, { x: 5, y: 5 }, 1, [100, 100, 100, 255], 64, { blend: "screen" })
    // 255 - (155 * 155 / 255) = 255 - 94.2 ≈ 161
    expect(getPixel(screen, 5, 5)[0]).toBe(161)
  })

  it("partially erases pixels when eraser opacity is below 100%", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [100, 100, 100, 255])
    applyEraser(buffer, { x: 5, y: 5 }, 1, 64, { opacity: 0.5 })
    expect(getPixel(buffer, 5, 5)[3]).toBe(128)

    applyEraser(buffer, { x: 5, y: 5 }, 1, 64, { opacity: 1 })
    expect(getPixel(buffer, 5, 5)).toEqual([0, 0, 0, 0])
  })

  it("scales shading strength with brush opacity", () => {
    const strong = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(strong, 5, 5, [100, 100, 100, 255])
    applyShading(strong, { x: 5, y: 5 }, 1, "lighten", 0.1, 64, { opacity: 1 })

    const soft = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(soft, 5, 5, [100, 100, 100, 255])
    applyShading(soft, { x: 5, y: 5 }, 1, "lighten", 0.1, 64, { opacity: 0.5 })

    expect(getPixel(strong, 5, 5)[0]).toBeGreaterThan(getPixel(soft, 5, 5)[0])
  })
})

describe("drawRectangle", () => {
  it("fills the bounding box regardless of drag corner order", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawRectangle(
      buffer,
      { x: 11, y: 10 },
      { x: 8, y: 8 },
      [255, 0, 0, 255],
    )
    expect(modified).toHaveLength(12)
    for (let y = 8; y <= 10; y++) {
      for (let x = 8; x <= 11; x++) {
        expect(getPixel(buffer, x, y)).toEqual([255, 0, 0, 255])
      }
    }
    expect(getPixel(buffer, 7, 8)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 8, 7)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 12, 10)).toEqual([0, 0, 0, 0])
  })

  it("leaves the interior unpainted when hollow with thickness 1", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawRectangle(
      buffer,
      { x: 8, y: 8 },
      { x: 11, y: 10 },
      [255, 0, 0, 255],
      64,
      { fill: "hollow" },
    )
    // 4x3 perimeter: 2*(4 + 3) - 4 = 10
    expect(modified).toHaveLength(10)
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 11, 10)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 9, 9)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 10, 9)).toEqual([0, 0, 0, 0])
  })

  it("widens the hollow outline with thickness", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawRectangle(
      buffer,
      { x: 8, y: 8 },
      { x: 13, y: 12 },
      [255, 0, 0, 255],
      64,
      { fill: "hollow", thickness: 2 },
    )
    // 6x5 box, 2px ring leaves a 2x1 interior
    expect(modified).toHaveLength(28)
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 13, 12)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 9, 9)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 10, 10)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 11, 10)).toEqual([0, 0, 0, 0])
  })

  it("fills solid when the box is thinner than twice the thickness", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    drawRectangle(
      buffer,
      { x: 8, y: 8 },
      { x: 9, y: 9 },
      [255, 0, 0, 255],
      64,
      { fill: "hollow", thickness: 2 },
    )
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 9, 9)).toEqual([255, 0, 0, 255])
  })

  it("stamps a single texel when start equals end", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const filled = drawRectangle(buffer, { x: 5, y: 5 }, { x: 5, y: 5 }, [255, 0, 0, 255])
    expect(filled).toHaveLength(1)

    const hollow = new Uint8ClampedArray(64 * 64 * 4)
    drawRectangle(hollow, { x: 5, y: 5 }, { x: 5, y: 5 }, [255, 0, 0, 255], 64, {
      fill: "hollow",
      thickness: 3,
    })
    expect(getPixel(hollow, 5, 5)).toEqual([255, 0, 0, 255])
  })

  it("clips shapes to the face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawRectangle(
      buffer,
      { x: 6, y: 8 },
      { x: 12, y: 10 },
      [255, 0, 0, 255],
      64,
      { clip: { x: 8, y: 8, w: 8, h: 8 } },
    )
    expect(getPixel(buffer, 7, 8)).toEqual([0, 0, 0, 0])
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 12, 8)).toEqual([255, 0, 0, 255])
    for (const pt of modified) {
      expect(pt.x).toBeGreaterThanOrEqual(8)
      expect(pt.x).toBeLessThan(16)
      expect(pt.y).toBeGreaterThanOrEqual(8)
      expect(pt.y).toBeLessThan(16)
    }
  })
})

describe("drawEllipse", () => {
  it("fills the ellipse and excludes the bounding box corners", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawEllipse(
      buffer,
      { x: 8, y: 8 },
      { x: 15, y: 11 },
      [255, 0, 0, 255],
    )
    expect(modified.length).toBeGreaterThan(0)
    expect(getPixel(buffer, 8, 8)[3]).toBe(0)
    expect(getPixel(buffer, 15, 11)[3]).toBe(0)
    expect(getPixel(buffer, 11, 9)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 8, 9)).toEqual([255, 0, 0, 255])
  })

  it("hollow ellipse paints only the ring around the center", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    drawEllipse(
      buffer,
      { x: 8, y: 8 },
      { x: 15, y: 11 },
      [255, 0, 0, 255],
      64,
      { fill: "hollow" },
    )
    expect(getPixel(buffer, 8, 8)[3]).toBe(0)
    expect(getPixel(buffer, 8, 9)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 11, 9)[3]).toBe(0)
  })

  it("hollow ellipse thickens the ring with thickness", () => {
    const thin = new Uint8ClampedArray(64 * 64 * 4)
    drawEllipse(thin, { x: 8, y: 8 }, { x: 15, y: 11 }, [255, 0, 0, 255], 64, {
      fill: "hollow",
    })
    const thick = new Uint8ClampedArray(64 * 64 * 4)
    drawEllipse(thick, { x: 8, y: 8 }, { x: 15, y: 11 }, [255, 0, 0, 255], 64, {
      fill: "hollow",
      thickness: 2,
    })
    // Thickness 2 leaves an empty inner ellipse, so the whole ellipse fills
    expect(getPixel(thick, 11, 9)).toEqual([255, 0, 0, 255])
    expect(getPixel(thick, 10, 9)).toEqual([255, 0, 0, 255])
    const thickCount = thick.reduce((n, v, i) => (i % 4 === 3 && v > 0 ? n + 1 : n), 0)
    const thinCount = thin.reduce((n, v, i) => (i % 4 === 3 && v > 0 ? n + 1 : n), 0)
    expect(thickCount).toBeGreaterThan(thinCount)
  })

  it("fills solid when the ellipse is thinner than twice the thickness", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    drawEllipse(
      buffer,
      { x: 8, y: 8 },
      { x: 9, y: 9 },
      [255, 0, 0, 255],
      64,
      { fill: "hollow", thickness: 3 },
    )
    expect(getPixel(buffer, 8, 8)).toEqual([255, 0, 0, 255])
    expect(getPixel(buffer, 9, 9)).toEqual([255, 0, 0, 255])
  })

  it("stamps a single texel when start equals end", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawEllipse(buffer, { x: 5, y: 5 }, { x: 5, y: 5 }, [255, 0, 0, 255])
    expect(modified).toHaveLength(1)
    expect(getPixel(buffer, 5, 5)).toEqual([255, 0, 0, 255])
  })

  it("clips shapes to the face rect", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    const modified = drawEllipse(
      buffer,
      { x: 4, y: 8 },
      { x: 14, y: 12 },
      [255, 0, 0, 255],
      64,
      { fill: "hollow", clip: { x: 8, y: 8, w: 8, h: 8 } },
    )
    expect(getPixel(buffer, 7, 9)[3]).toBe(0)
    expect(getPixel(buffer, 8, 8)[3]).toBeGreaterThan(0)
    for (const pt of modified) {
      expect(pt.x).toBeGreaterThanOrEqual(8)
      expect(pt.x).toBeLessThan(16)
      expect(pt.y).toBeGreaterThanOrEqual(8)
      expect(pt.y).toBeLessThan(16)
    }
  })
})

describe("shape options", () => {
  it("applies opacity like fills", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    drawRectangle(buffer, { x: 5, y: 5 }, { x: 6, y: 5 }, [255, 0, 0, 255], 64, {
      opacity: 0.5,
    })
    expect(getPixel(buffer, 5, 5)[3]).toBe(128)
  })

  it("applies blend modes against existing pixels", () => {
    const buffer = new Uint8ClampedArray(64 * 64 * 4)
    setPixel(buffer, 5, 5, [200, 100, 50, 255])
    drawRectangle(buffer, { x: 5, y: 5 }, { x: 5, y: 5 }, [255, 255, 255, 255], 64, {
      blend: "multiply",
    })
    expect(getPixel(buffer, 5, 5)).toEqual([200, 100, 50, 255])
  })
})

describe("region-sourced fills", () => {
  it("floodFill computes its region from regionSource but writes into data", () => {
    // paint layer (data): blank. composite (regionSource): a red island.
    const paint = new Uint8ClampedArray(64 * 64 * 4)
    const composite = new Uint8ClampedArray(64 * 64 * 4)
    for (let y = 8; y < 12; y++) {
      for (let x = 8; x < 12; x++) {
        const idx = (y * 64 + x) * 4
        composite[idx] = 255
        composite[idx + 3] = 255
      }
    }
    const modified = floodFill(
      paint,
      { x: 9, y: 9 },
      [0, 0, 255, 255],
      64,
      {},
      composite,
    )

    // The whole red island in the composite gets painted blue into paint
    expect(modified.length).toBe(16)
    const paintedIdx = (9 * 64 + 9) * 4
    expect(paint[paintedIdx]).toBe(0)
    expect(paint[paintedIdx + 2]).toBe(255)
    // Outside the island the paint layer stays untouched
    expect(paint[0]).toBe(0)
  })

  it("colorsFill replaces matching composite texels into data", () => {
    const paint = new Uint8ClampedArray(64 * 64 * 4)
    const composite = new Uint8ClampedArray(64 * 64 * 4)
    for (let x = 20; x < 24; x++) {
      const idx = (20 * 64 + x) * 4
      composite[idx] = 255
      composite[idx + 3] = 255
    }
    const modified = colorsFill(
      paint,
      { x: 20, y: 20 },
      [0, 255, 0, 255],
      64,
      {},
      composite,
    )
    expect(modified.length).toBe(4)
  })
})

