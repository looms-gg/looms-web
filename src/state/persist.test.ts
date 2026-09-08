import { describe, expect, it } from "vitest"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { clampHue, persistDefaults } from "./persist"

describe("persistDefaults", () => {
  it("starts with an empty wardrobe and classic model", () => {
    expect(persistDefaults.owned).toEqual([])
    expect(persistDefaults.looks).toEqual([])
    expect(persistDefaults.model).toBe("classic")
    expect(persistDefaults.bodyId).toBe(DEFAULT_BODY_ID)
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
