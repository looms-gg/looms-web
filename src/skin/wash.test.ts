import { describe, expect, it } from "vitest"
import { complementaryPastel, washFromCanvas, washFromPixels } from "./wash"

describe("wash", () => {
  it("flips a red sample to a cool pastel", () => {
    const wash = complementaryPastel(210, 48, 52)
    expect(wash.startsWith("oklch(0.91")).toBe(true)
    const hue = Number(wash.replace(/.* /, "").replace(")", ""))
    expect(hue).toBeGreaterThan(160)
    expect(hue).toBeLessThan(230)
  })

  it("uses a warm pastel when the sample is a dark gray", () => {
    expect(complementaryPastel(36, 36, 40)).toBe("oklch(0.91 0.042 85)")
  })

  it("ignores transparent and gray pixels", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 0, 40, 40, 40, 255, 32, 140, 70, 255, 32, 140, 70, 255, 32, 140,
      70, 255, 32, 140, 70, 255,
    ])
    const wash = washFromPixels(data)
    const hue = Number(wash.replace(/.* /, "").replace(")", ""))
    expect(hue).toBeGreaterThan(280)
    expect(hue).toBeLessThan(360)
  })

  it("computes wash from a canvas directly", () => {
    const canvas = document.createElement("canvas")
    canvas.width = 2
    canvas.height = 2
    const ctx = canvas.getContext("2d")
    if (ctx) {
      const imgData = ctx.createImageData(2, 2)
      // Fill with blueish pixels
      for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = 30
        imgData.data[i + 1] = 60
        imgData.data[i + 2] = 200
        imgData.data[i + 3] = 255
      }
      ctx.putImageData(imgData, 0, 0)
    }
    const wash = washFromCanvas(canvas)
    expect(wash.startsWith("oklch(0.91")).toBe(true)
  })
})
