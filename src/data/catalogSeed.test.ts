import { describe, expect, it } from "vitest"
import { fixturePieces } from "./catalogSeed"
import { getPiece, replaceCatalog } from "./catalog"

describe("catalogSeed", () => {
  it("keeps the lofted wardrobe ids", () => {
    const seeded = fixturePieces()
    replaceCatalog(seeded)
    expect(seeded).toHaveLength(22)
    expect(getPiece("winter-coat")?.maker).toBe("PyreDev")
    expect(getPiece("ink-fall")?.covers).toEqual(["head", "torso"])
  })
})
