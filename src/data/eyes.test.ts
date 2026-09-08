import { describe, expect, it } from "vitest"
import {
  bundledEyes,
  EYES_WITH_WHITES,
  getEye,
  getEyePiece,
  parseEyeId,
  formatEyeId,
} from "./eyes"

describe("bundledEyes", () => {
  it("loads 71 unique bundled eyes", () => {
    expect(bundledEyes).toHaveLength(71)
  })

  it("assigns valid IDs and skin/thumb paths", () => {
    const eye01 = bundledEyes.find((e) => e.id === "eye-01")
    expect(eye01?.name).toBe("Eyes #01")
    expect(eye01?.skin).toBeTruthy()
    expect(eye01?.thumb).toBeTruthy()
  })

  it("retrieves eye piece with slot 'eyes'", () => {
    const eye = getEye("eye-05")
    expect(eye).toBeDefined()
    const piece = getEyePiece("eye-05")
    expect(piece).toBeDefined()
    expect(piece?.slot).toBe("eyes")
    expect(piece?.group).toBe("head")
    expect(piece?.covers).toEqual(["head"])
    expect(piece?.offsetY).toBe(0)
  })

  it("parses and formats eye IDs with offsets", () => {
    const parsedZero = parseEyeId("eye-05")
    expect(parsedZero).toEqual({ baseId: "eye-05", offset: 0 })

    const parsedNeg = parseEyeId("eye-05@-2")
    expect(parsedNeg).toEqual({ baseId: "eye-05", offset: -2 })

    const parsedClamped = parseEyeId("eye-05@-10")
    expect(parsedClamped).toEqual({ baseId: "eye-05", offset: -3 })

    expect(formatEyeId("eye-05", 0)).toBe("eye-05")
    expect(formatEyeId("eye-05", -1)).toBe("eye-05@-1")
    expect(formatEyeId("eye-05", 1)).toBe("eye-05@1")

    const pieceWithOffset = getEyePiece("eye-05@-1")
    expect(pieceWithOffset?.id).toBe("eye-05@-1")
    expect(pieceWithOffset?.offsetY).toBe(-1)
    expect(getEye("eye-05@-1")?.id).toBe("eye-05")
  })
})

describe("hasWhites sort", () => {
  it("marks known eyes correctly", () => {
    expect(bundledEyes.find((e) => e.id === "eye-01")?.hasWhites).toBe(false)
    expect(bundledEyes.find((e) => e.id === "eye-40")?.hasWhites).toBe(true)
    expect(bundledEyes.find((e) => e.id === "eye-71")?.hasWhites).toBe(true)
  })

  it("lists every EYES_WITH_WHITES id and no others", () => {
    const flagged = bundledEyes.filter((e) => e.hasWhites).map((e) => e.id)
    expect(new Set(flagged)).toEqual(EYES_WITH_WHITES)
    expect(flagged).toHaveLength(EYES_WITH_WHITES.size)
  })

  it("orders whites before no-whites, stable by id within each group", () => {
    const ids = bundledEyes.map((e) => e.id)
    const firstWithout = bundledEyes.findIndex((e) => !e.hasWhites)
    expect(firstWithout).toBeGreaterThan(0)
    expect(bundledEyes.slice(0, firstWithout).every((e) => e.hasWhites)).toBe(true)
    expect(bundledEyes.slice(firstWithout).every((e) => !e.hasWhites)).toBe(true)

    const withIds = bundledEyes.filter((e) => e.hasWhites).map((e) => e.id)
    const withoutIds = bundledEyes.filter((e) => !e.hasWhites).map((e) => e.id)
    expect(withIds).toEqual([...withIds].sort())
    expect(withoutIds).toEqual([...withoutIds].sort())
    expect(ids[0]).not.toBe("eye-01")
  })
})
