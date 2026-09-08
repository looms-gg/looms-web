import { describe, expect, it } from "vitest"
import { pieces } from "../data/catalog"
import { filterExplorePieces } from "./exploreBrowse"

describe("filterExplorePieces", () => {
  it("filters by slot", () => {
    const hats = filterExplorePieces(pieces, "", "hat", "Newest")
    expect(hats.every((piece) => piece.slot === "hat")).toBe(true)
  })

  it("ranks trending differently from most saved", () => {
    const trending = filterExplorePieces(pieces, "", "all", "Trending")
    const saved = filterExplorePieces(pieces, "", "all", "Most Saved")
    expect(trending.map((piece) => piece.id)).not.toEqual(saved.map((piece) => piece.id))
  })

  it("orders most saved by savedCount descending", () => {
    const list = filterExplorePieces(pieces, "", "all", "Most Saved")
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].savedCount).toBeGreaterThanOrEqual(list[i].savedCount)
    }
  })

  it("matches name search", () => {
    const found = filterExplorePieces(pieces, "winter", "all", "Newest")
    expect(found.some((piece) => piece.id === "winter-coat")).toBe(true)
  })
})
