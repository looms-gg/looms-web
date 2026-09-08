import { describe, expect, it } from "vitest"
import { getPiece, pieceCovers, pieces, visibleCovers } from "./catalog"

describe("catalog", () => {
  it("looks up pieces without a fallback", () => {
    expect(getPiece(pieces[0].id)?.id).toBe(pieces[0].id)
    expect(getPiece("missing-piece")).toBeUndefined()
  })

  it("every piece has a skin url", () => {
    expect(pieces.every((piece) => piece.skin.length > 0)).toBe(true)
  })

  it("uses covers when present, else the rack group", () => {
    const hair = pieces.find((piece) => piece.id === "ash-crop")!
    expect(pieceCovers(hair)).toEqual(["head"])
  })

  it("drops atlas regions a hanging shirt does not claim", () => {
    const sweater = getPiece("christmas-sweater")!
    expect(visibleCovers(sweater, ["head", "torso", "legs"])).toEqual([
      "torso",
      "legs",
    ])
  })
})

