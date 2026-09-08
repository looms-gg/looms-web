import { describe, expect, it } from "vitest"
import {
  filterAndSortPublicLooks,
  type PublicLook,
  DEFAULT_FEATURED_LOOKS,
} from "./publicLooks"

function makeLook(overrides: Partial<PublicLook> & { id: string; name: string }): PublicLook {
  return {
    userId: "user-1",
    description: "",
    visibility: "public",
    stack: ["ink-fall", "winter-coat"],
    bodyId: "slate",
    bodyHue: 0,
    model: "classic",
    likeCount: 0,
    createdAt: 1000,
    updatedAt: 1000,
    maker: "notch",
    makerAvatarUrl: null,
    ...overrides,
  }
}

describe("filterAndSortPublicLooks", () => {
  const looks: PublicLook[] = [
    makeLook({
      id: "l1",
      name: "Winter Wanderer",
      maker: "Alex",
      model: "classic",
      likeCount: 5,
      createdAt: 1000,
    }),
    makeLook({
      id: "l2",
      name: "Summer Breeze",
      maker: "Steve",
      model: "slim",
      likeCount: 20,
      createdAt: 500,
    }),
    makeLook({
      id: "l3",
      name: "Cyber Punk",
      maker: "Cen0b",
      model: "classic",
      likeCount: 12,
      createdAt: 3000,
    }),
  ]

  it("filters by query matching name or maker", () => {
    const byName = filterAndSortPublicLooks(looks, "winter", "Newest", "all")
    expect(byName.map((l) => l.id)).toEqual(["l1"])

    const byMaker = filterAndSortPublicLooks(looks, "steve", "Newest", "all")
    expect(byMaker.map((l) => l.id)).toEqual(["l2"])
  })

  it("filters by model", () => {
    const slimOnly = filterAndSortPublicLooks(looks, "", "Newest", "slim")
    expect(slimOnly.map((l) => l.id)).toEqual(["l2"])

    const classicOnly = filterAndSortPublicLooks(looks, "", "Newest", "classic")
    expect(classicOnly.map((l) => l.id)).toEqual(["l3", "l1"])
  })

  it("sorts by Newest", () => {
    const sorted = filterAndSortPublicLooks(looks, "", "Newest", "all")
    expect(sorted.map((l) => l.id)).toEqual(["l3", "l1", "l2"])
  })

  it("sorts by Popular (most liked)", () => {
    const sorted = filterAndSortPublicLooks(looks, "", "Popular", "all")
    expect(sorted.map((l) => l.id)).toEqual(["l2", "l3", "l1"])
  })

  it("sorts by Trending (recency and likes combined)", () => {
    const sorted = filterAndSortPublicLooks(looks, "", "Trending", "all")
    expect(sorted[0].id).toBe("l3") // high recency + solid likes
  })
})

describe("DEFAULT_FEATURED_LOOKS", () => {
  it("provides 3 distinct starter looks", () => {
    expect(DEFAULT_FEATURED_LOOKS.length).toBe(3)
    expect(new Set(DEFAULT_FEATURED_LOOKS.map((l) => l.id)).size).toBe(3)
  })
})
