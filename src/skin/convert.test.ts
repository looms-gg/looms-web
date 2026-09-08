import { describe, expect, it } from "vitest"
import {
  detectSkinModel,
  classicToSlimImageData,
  slimToClassicImageData,
} from "./convert"

function makeAtlasData(): Uint8ClampedArray {
  return new Uint8ClampedArray(64 * 64 * 4)
}

function setPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  r = 255,
  g = 255,
  b = 255,
  a = 255,
) {
  const idx = (y * 64 + x) * 4
  data[idx] = r
  data[idx + 1] = g
  data[idx + 2] = b
  data[idx + 3] = a
}

function getAlpha(data: Uint8ClampedArray, x: number, y: number): number {
  return data[(y * 64 + x) * 4 + 3]
}

describe("Skin Model Conversion", () => {
  it("detects universal when arm regions are empty", () => {
    const data = makeAtlasData()
    // head pixel only
    setPixel(data, 10, 10)
    expect(detectSkinModel(data)).toBe("universal")
  })

  it("detects classic when Steve-exclusive columns have opaque pixels", () => {
    const data = makeAtlasData()
    // Right arm main back face col 55
    setPixel(data, 55, 24)
    expect(detectSkinModel(data)).toBe("classic")
  })

  it("detects slim when arm pixels exist but Steve-exclusive columns are empty", () => {
    const data = makeAtlasData()
    // Right arm main front face col 44 (exists in both)
    setPixel(data, 44, 24)
    expect(detectSkinModel(data)).toBe("slim")
  })

  it("converts classic to slim by narrowing arm faces and clearing extra columns", () => {
    const data = makeAtlasData()
    // Fill classic right arm front (44..47, y=20)
    for (let x = 44; x <= 47; x++) setPixel(data, x, 20, 100, 150, 200, 255)
    // Fill classic right arm back (52..55, y=20)
    for (let x = 52; x <= 55; x++) setPixel(data, x, 20, 100, 150, 200, 255)

    const img = { data, width: 64, height: 64 } as ImageData
    const slim = classicToSlimImageData(img)

    // In slim, col 55 and 54 must be transparent
    expect(getAlpha(slim.data, 55, 20)).toBe(0)
    expect(getAlpha(slim.data, 54, 20)).toBe(0)
    // Front face should have 3 pixels at 44, 45, 46
    expect(getAlpha(slim.data, 44, 20)).toBe(255)
    expect(getAlpha(slim.data, 45, 20)).toBe(255)
    expect(getAlpha(slim.data, 46, 20)).toBe(255)
  })

  it("converts slim to classic by expanding 3px faces to 4px", () => {
    const data = makeAtlasData()
    // Fill slim right arm front (44..46, y=20)
    for (let x = 44; x <= 46; x++) setPixel(data, x, 20, 100, 150, 200, 255)
    // Fill slim right arm back (51..53, y=20)
    for (let x = 51; x <= 53; x++) setPixel(data, x, 20, 100, 150, 200, 255)

    const img = { data, width: 64, height: 64 } as ImageData
    const classic = slimToClassicImageData(img)

    // In classic, col 55 should be populated
    expect(getAlpha(classic.data, 55, 20)).toBe(255)
    // Front face should have 4 pixels at 44, 45, 46, 47
    for (let x = 44; x <= 47; x++) {
      expect(getAlpha(classic.data, x, 20)).toBe(255)
    }
  })

  it("handles left arm and sleeve layers during classic to slim conversion", () => {
    const data = makeAtlasData()
    // Fill classic left arm sleeve back (60..63, y=52)
    for (let x = 60; x <= 63; x++) setPixel(data, x, 52, 200, 100, 50, 255)

    const img = { data, width: 64, height: 64 } as ImageData
    const slim = classicToSlimImageData(img)

    // In slim, col 63 and 62 must be 0
    expect(getAlpha(slim.data, 63, 52)).toBe(0)
    expect(getAlpha(slim.data, 62, 52)).toBe(0)
    // Left sleeve back in slim is 59..61
    expect(getAlpha(slim.data, 59, 52)).toBe(255)
    expect(getAlpha(slim.data, 60, 52)).toBe(255)
    expect(getAlpha(slim.data, 61, 52)).toBe(255)
  })
})
