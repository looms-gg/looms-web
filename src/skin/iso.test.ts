import { describe, expect, it } from "vitest"
import { isoOutfitThumb, isoOutfitUrl, isoPieceThumb, isoPieceUrl } from "./iso"

describe("iso", () => {
  it("exports thumbnail jobs", () => {
    expect(typeof isoOutfitUrl).toBe("function")
    expect(typeof isoPieceUrl).toBe("function")
    expect(typeof isoPieceThumb).toBe("function")
    expect(typeof isoOutfitThumb).toBe("function")
  })
})

