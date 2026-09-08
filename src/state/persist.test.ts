import { describe, expect, it } from "vitest"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { clampHue, freshPersist, persistDefaults } from "./persist"

describe("persistDefaults", () => {
  it("starts with an empty wardrobe and classic model", () => {
    expect(persistDefaults.owned).toEqual([])
    expect(persistDefaults.looks).toEqual([])
    expect(persistDefaults.model).toBe("classic")
    expect(persistDefaults.bodyId).toBe(DEFAULT_BODY_ID)
  })
})

describe("freshPersist", () => {
  it("returns a deep-enough copy so mutations do not touch persistDefaults", () => {
    const a = freshPersist()
    const b = freshPersist()
    a.owned.push("piece-1")
    a.looks.push({
      id: "look-1",
      name: "x",
      equipped: {},
      stack: [],
      bodyId: DEFAULT_BODY_ID,
      bodyHue: 0,
      model: "classic",
      savedAt: 1,
      description: "",
      visibility: "private",
    })
    a.equipped.shirt = "piece-1"
    expect(persistDefaults.owned).toEqual([])
    expect(persistDefaults.looks).toEqual([])
    expect(persistDefaults.equipped).toEqual({})
    expect(b.owned).toEqual([])
    expect(b.looks).toEqual([])
  })
})

describe("clampHue", () => {
  it("clamps and rounds finite numbers", () => {
    expect(clampHue(12.6)).toBe(13)
    expect(clampHue(-200)).toBe(-120)
    expect(clampHue(200)).toBe(120)
  })

  it("returns 0 for non-finite values", () => {
    expect(clampHue(Number.NaN)).toBe(0)
    expect(clampHue("nope")).toBe(0)
    expect(clampHue(null)).toBe(0)
  })
})
