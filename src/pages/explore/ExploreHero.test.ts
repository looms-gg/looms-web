import { describe, expect, it } from "vitest"
import { pieces } from "../../data/catalog"
import { pickFeaturedPieces } from "./ExploreHero"

describe("pickFeaturedPieces", () => {
  it("returns the Winter Explorer layers when present in catalog", () => {
    const featured = pickFeaturedPieces(pieces)
    expect(featured.map((p) => p.id)).toEqual([
      "ink-fall",
      "winter-coat",
      "dark-sweatpants",
      "knee-high-converse",
    ])
  })

  it("skips missing ids", () => {
    expect(pickFeaturedPieces([])).toEqual([])
  })
})
