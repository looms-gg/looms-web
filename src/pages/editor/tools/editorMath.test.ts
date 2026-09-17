import { describe, it, expect } from "vitest"
import {
  uvToTexel,
  interpolateLine,
  isWithinRect,
  findCuboidFaceAtTexel,
} from "./editorMath"

describe("editorMath", () => {
  it("converts uv coordinates to 64x64 texels correctly", () => {
    expect(uvToTexel(0, 1)).toEqual({ x: 0, y: 0 })
    expect(uvToTexel(0.5, 0.5)).toEqual({ x: 32, y: 32 })
    expect(uvToTexel(0.999, 0.001)).toEqual({ x: 63, y: 63 })
  })

  it("clamps uv coordinates out of bounds", () => {
    expect(uvToTexel(-0.2, 1.2)).toEqual({ x: 0, y: 0 })
    expect(uvToTexel(1.5, -0.5)).toEqual({ x: 63, y: 63 })
  })

  it("interpolates continuous lines using Bresenham algorithm", () => {
    const points = interpolateLine({ x: 2, y: 3 }, { x: 5, y: 3 })
    expect(points).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ])
  })

  it("handles vertical and diagonal line interpolation", () => {
    const vertical = interpolateLine({ x: 4, y: 2 }, { x: 4, y: 4 })
    expect(vertical).toEqual([
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
    ])

    const diagonal = interpolateLine({ x: 0, y: 0 }, { x: 2, y: 2 })
    expect(diagonal).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ])
  })

  it("checks whether point is within rect", () => {
    const rect = { x: 8, y: 8, w: 8, h: 8 }
    expect(isWithinRect({ x: 8, y: 8 }, rect)).toBe(true)
    expect(isWithinRect({ x: 15, y: 15 }, rect)).toBe(true)
    expect(isWithinRect({ x: 16, y: 8 }, rect)).toBe(false)
    expect(isWithinRect({ x: 7, y: 8 }, rect)).toBe(false)
  })

  it("finds the cuboid face rect for a texel", () => {
    // Head front face is at { x: 8, y: 8, w: 8, h: 8 }
    const match = findCuboidFaceAtTexel({ x: 10, y: 10 })
    expect(match).not.toBeNull()
    expect(match?.cuboidName).toBe("head")
    expect(match?.face).toBe("front")
  })
})

