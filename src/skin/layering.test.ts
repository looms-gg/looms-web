import { describe, expect, it } from "vitest"
import { punchAndLiftOuter } from "./compose"
import { BODY, HAT, HEAD, JACKET } from "./uv"

const ATLAS = 64

function blank() {
  return new Uint8ClampedArray(ATLAS * ATLAS * 4)
}

function paint(data: Uint8ClampedArray, x: number, y: number, a = 255) {
  const i = (y * ATLAS + x) * 4
  data[i] = 10
  data[i + 1] = 20
  data[i + 2] = 30
  data[i + 3] = a
}

function alpha(data: Uint8ClampedArray, x: number, y: number) {
  return data[(y * ATLAS + x) * 4 + 3]
}

describe("punchAndLiftOuter", () => {
  it("clears dest outer texels where the piece paints the matching inner face", () => {
    const dest = blank()
    const piece = blank()
    paint(dest, HAT.front.x, HAT.front.y)
    paint(piece, HEAD.front.x, HEAD.front.y)
    punchAndLiftOuter(dest, piece, false)
    expect(alpha(dest, HAT.front.x, HAT.front.y)).toBe(0)
  })

  it("lifts inner body paint onto an occupied jacket texel", () => {
    const dest = blank()
    const piece = blank()
    paint(dest, JACKET.front.x, JACKET.front.y, 200)
    paint(piece, BODY.front.x, BODY.front.y, 255)
    punchAndLiftOuter(dest, piece, false)
    const i = (JACKET.front.y * ATLAS + JACKET.front.x) * 4
    expect(dest[i]).toBe(10)
    expect(dest[i + 3]).toBe(255)
  })
})

describe("shiftEyeImageData", () => {
  it("shifts eye pixels vertically on HEAD.front", async () => {
    const { shiftEyeImageData } = await import("./compose")
    const data = blank()
    // Paint eye at (10, 13)
    paint(data, 10, 13, 255)

    // Move up by 1 (-1)
    shiftEyeImageData(data, -1)
    expect(alpha(data, 10, 13)).toBe(0)
    expect(alpha(data, 10, 12)).toBe(255)

    // Move down by 2 (+2) -> from 12 to 14
    shiftEyeImageData(data, 2)
    expect(alpha(data, 10, 12)).toBe(0)
    expect(alpha(data, 10, 14)).toBe(255)
  })

  it("clamps eye pixels within face bounds", async () => {
    const { shiftEyeImageData } = await import("./compose")
    const data = blank()
    // Paint eye at (10, 13)
    paint(data, 10, 13, 255)

    // Move down by 10 (should be discarded or clamped, not leak outside HEAD.front)
    shiftEyeImageData(data, 10)
    expect(alpha(data, 10, 23)).toBe(0)
  })
})

