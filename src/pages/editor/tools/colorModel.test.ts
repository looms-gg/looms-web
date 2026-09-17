import { describe, expect, it } from "vitest"
import { hexToHsv, hsvToHex, normalizeHex } from "./colorModel"

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function near(a: string, b: string, tol = 1): boolean {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return (
    Math.abs(r1 - r2) <= tol &&
    Math.abs(g1 - g2) <= tol &&
    Math.abs(b1 - b2) <= tol
  )
}

describe("hexToHsv", () => {
  it("converts red", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 1, v: 1 })
  })

  it("converts black to zero saturation and value", () => {
    const hsv = hexToHsv("#000000")
    expect(hsv.s).toBe(0)
    expect(hsv.v).toBe(0)
  })

  it("converts white correctly", () => {
    expect(hexToHsv("#ffffff")).toEqual({ h: 0, s: 0, v: 1 })
  })

  it("converts a mid color", () => {
    expect(hexToHsv("#00ff80")).toEqual({ h: 150, s: 1, v: 1 })
  })
})

describe("hsvToHex", () => {
  it("round-trips through hsv within a rounding step", () => {
    const cases = ["#ff0000", "#00ff80", "#3880ff", "#cf4878", "#131418"]
    for (const hex of cases) {
      const back = hsvToHex(hexToHsv(hex))
      expect(near(back, hex)).toBe(true)
    }
  })

  it("wraps negative and over-360 hues", () => {
    expect(hsvToHex({ h: -60, s: 1, v: 1 })).toBe("#ff00ff")
    expect(hsvToHex({ h: 420, s: 1, v: 1 })).toBe("#ffff00")
  })
})

describe("normalizeHex", () => {
  it("accepts input with or without hash", () => {
    expect(normalizeHex(" 3880ff")).toBe("#3880ff")
    expect(normalizeHex("#CF4878")).toBe("#cf4878")
    expect(normalizeHex("red")).toBeNull()
    expect(normalizeHex("#fff1")).toBeNull()
  })
})
