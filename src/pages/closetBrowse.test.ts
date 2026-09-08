import { describe, expect, it } from "vitest"
import { pieces } from "../data/catalog"
import { filterClosetPieces } from "./closetBrowse"

describe("filterClosetPieces", () => {
  it("filters by slot", () => {
    const hats = filterClosetPieces(pieces, "", "hat", "Newest")
    expect(hats.every((piece) => piece.slot === "hat")).toBe(true)
  })

  it("ranks trending differently from most saved", () => {
    const trending = filterClosetPieces(pieces, "", "all", "Trending")
    const saved = filterClosetPieces(pieces, "", "all", "Most Saved")
    expect(trending.map((piece) => piece.id)).not.toEqual(saved.map((piece) => piece.id))
  })

  it("orders most saved by savedCount descending", () => {
    const list = filterClosetPieces(pieces, "", "all", "Most Saved")
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].savedCount).toBeGreaterThanOrEqual(list[i].savedCount)
    }
  })

  it("matches name search", () => {
    const found = filterClosetPieces(pieces, "winter", "all", "Newest")
    expect(found.some((piece) => piece.id === "winter-coat")).toBe(true)
  })
})
