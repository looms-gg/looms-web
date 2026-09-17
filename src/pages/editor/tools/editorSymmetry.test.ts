import { describe, it, expect } from "vitest"
import { getMirroredTexel, getSymmetricPoints } from "./editorSymmetry"

describe("editorSymmetry", () => {
  it("mirrors coordinates within Head front face horizontally", () => {
    // Head front is x: 8..15, y: 8..15.
    const p = { x: 8, y: 10 }
    const mirrored = getMirroredTexel(p)
    expect(mirrored).toEqual({ x: 15, y: 10 })

    const pCenter = { x: 11, y: 12 }
    expect(getMirroredTexel(pCenter)).toEqual({ x: 12, y: 12 })
  })

  it("mirrors Head right side to left side", () => {
    // HEAD.right: { x: 0, y: 8, w: 8, h: 8 }
    // HEAD.left: { x: 16, y: 8, w: 8, h: 8 }
    const p = { x: 0, y: 9 }
    const mirrored = getMirroredTexel(p)
    expect(mirrored).toEqual({ x: 23, y: 9 })
  })

  it("mirrors Right Arm to Left Arm", () => {
    // Right Arm front is x: 44..47, y: 20..31
    // Left Arm front is x: 36..39, y: 52..63
    const p = { x: 44, y: 20 }
    const mirrored = getMirroredTexel(p, false)
    expect(mirrored).toEqual({ x: 39, y: 52 })
  })

  it("mirrors Right Leg to Left Leg", () => {
    // Right Leg front is x: 4..7, y: 20..31
    // Left Leg front is x: 20..23, y: 52..63
    const p = { x: 4, y: 20 }
    const mirrored = getMirroredTexel(p)
    expect(mirrored).toEqual({ x: 23, y: 52 })
  })

  it("returns combined symmetric points without duplicates", () => {
    const original = [{ x: 8, y: 10 }]
    const sym = getSymmetricPoints(original)
    expect(sym).toHaveLength(2)
    expect(sym).toContainEqual({ x: 8, y: 10 })
    expect(sym).toContainEqual({ x: 15, y: 10 })
  })
})

