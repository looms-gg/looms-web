import { describe, expect, it } from "vitest"
import { fixturePieces } from "./catalogSeed"
import { getPiece, replaceCatalog } from "./catalog"

describe("catalogSeed", () => {
  it("returns clearly-fake inline fixtures across slots", () => {
    const seeded = fixturePieces()
    replaceCatalog(seeded)
    expect(seeded).toHaveLength(7)
    expect(seeded.every((piece) => piece.id.startsWith("fixture-"))).toBe(true)
    expect(getPiece("fixture-shirt")?.name).toBe("Test Shirt")
    expect(getPiece("fixture-shirt")?.slot).toBe("shirt")
    expect(getPiece("fixture-shoes")?.slot).toBe("shoes")
    expect(getPiece("fixture-hair")?.covers).toEqual(["head", "torso"])
  })

  it("falls back to the rack group when covers are absent", () => {
    const hat = fixturePieces().find((piece) => piece.id === "fixture-hat")!
    expect(hat.covers).toBeUndefined()
    expect(hat.group).toBe("head")
  })

  it("keeps one blurb-less piece for thin-content tests", () => {
    const hat = fixturePieces().find((piece) => piece.id === "fixture-hat")!
    expect(hat.blurb).toBe("")
  })

  it("accepts a custom maker and skin", () => {
    const [piece] = fixturePieces("Maker X", "data:image/png;base64,AAA")
    expect(piece.maker).toBe("Maker X")
    expect(piece.skin).toBe("data:image/png;base64,AAA")
  })
})
