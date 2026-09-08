import { describe, expect, it } from "vitest"
import { clampHue } from "../state/persist"
import { shiftHex, shiftRgb } from "./hue"

describe("hue", () => {
  it("leaves rgb unchanged at zero shift", () => {
    expect(shiftRgb(200, 120, 90, 0)).toEqual({ r: 200, g: 120, b: 90 })
  })

  it("rotates a hex swatch", () => {
    expect(shiftHex("#9d6b4c", 0)).toBe("#9d6b4c")
    expect(shiftHex("#9d6b4c", 40)).not.toBe("#9d6b4c")
  })

  it("clamps hue into the slider range", () => {
    expect(clampHue(Number.NaN)).toBe(0)
    expect(clampHue(400)).toBe(120)
    expect(clampHue(-400)).toBe(-120)
    expect(clampHue(12.4)).toBe(12)
  })
})
