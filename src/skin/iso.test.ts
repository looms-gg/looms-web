import { describe, expect, it } from "vitest"
import { isoOutfitThumb, isoOutfitUrl, isoPieceThumb, isoPieceUrl, skinHash } from "./iso"

describe("iso", () => {
  it("exports thumbnail jobs", () => {
    expect(typeof isoOutfitUrl).toBe("function")
    expect(typeof isoPieceUrl).toBe("function")
    expect(typeof isoPieceThumb).toBe("function")
    expect(typeof isoOutfitThumb).toBe("function")
  })
})

describe("skinHash", () => {
  it("changes when the texture url changes (overwrite re-bake)", () => {
    const base = "https://example.test/garments/user-1/piece-1.png"
    const overwritten = `${base}?v=1758123456789`
    expect(skinHash(base)).not.toBe(skinHash(overwritten))
    expect(skinHash(base)).toBe(skinHash(base))
  })

  it("stays short for inline data urls", () => {
    const hash = skinHash("data:image/png;base64," + "A".repeat(4096))
    expect(hash.length).toBeLessThan(10)
  })
})

