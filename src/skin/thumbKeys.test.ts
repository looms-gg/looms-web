import { describe, expect, it } from "vitest"
import { isoPieceCacheKey, skinHash } from "./thumbKeys"

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

describe("isoPieceCacheKey", () => {
  it("matches the live pipeline key shape", () => {
    const piece = { id: "p1", skin: "https://example.test/p1.png" }
    expect(isoPieceCacheKey("classic", true, piece)).toBe(
      `piece:v77:classic:fx:p1:${skinHash(piece.skin)}`,
    )
    expect(isoPieceCacheKey("classic", false, piece)).toBe(
      `piece:v77:classic:raw:p1:${skinHash(piece.skin)}`,
    )
  })
})
