import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchYesterdayTopLook,
  filterAndSortPublicLooks,
  type PublicLook,
  DEFAULT_FEATURED_LOOKS,
} from "./publicLooks"
import { supabase } from "../lib/supabase"

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

  it("sorts by Trending — velocity-aware: recent likes dominate over old likes", () => {
    // l4: many all-time likes but earned 3 days ago (no recent velocity)
    // l5: fewer total likes but hot right now (high recentLikeCount)
    const hotLooks: PublicLook[] = [
      makeLook({ id: "l4", name: "Old Fame", likeCount: 200, recentLikeCount: 0,  createdAt: Date.now() - 1000 * 60 * 60 * 72 }),
      makeLook({ id: "l5", name: "On Fire",  likeCount: 12,  recentLikeCount: 30, createdAt: Date.now() - 1000 * 60 * 60 * 2  }),
    ]
    const sorted = filterAndSortPublicLooks(hotLooks, "", "Trending", "all")
    expect(sorted[0].id).toBe("l5") // recent velocity beats stale fame
  })
})

describe("DEFAULT_FEATURED_LOOKS", () => {
  it("provides 3 distinct starter looks", () => {
    expect(DEFAULT_FEATURED_LOOKS.length).toBe(3)
    expect(new Set(DEFAULT_FEATURED_LOOKS.map((l) => l.id)).size).toBe(3)
  })
})

describe("fetchYesterdayTopLook", () => {
  const rpcRow = {
    id: "look-yay",
    user_id: "u-yay",
    name: "Yesterday's Champion",
    description: "The one everyone liked",
    visibility: "public",
    stack: ["winter-coat"],
    body_id: "slate",
    body_hue: 0,
    model: "classic",
    like_count: 42,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    username: "ChampMaker",
    avatar_url: null,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("maps the RPC row to a PublicLook", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: [rpcRow], error: null })

    const top = await fetchYesterdayTopLook()
    expect(top?.id).toBe("look-yay")
    expect(top?.name).toBe("Yesterday's Champion")
    expect(top?.maker).toBe("ChampMaker")
  })

  it("returns null when the RPC returns no rows (thin day)", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: [], error: null })

    expect(await fetchYesterdayTopLook()).toBeNull()
  })

  it("returns null when the RPC errors", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "boom" },
    })

    expect(await fetchYesterdayTopLook()).toBeNull()
  })

  it("returns null when the RPC throws (offline etc.)", async () => {
    vi.spyOn(supabase, "rpc").mockRejectedValue(new Error("offline"))

    expect(await fetchYesterdayTopLook()).toBeNull()
  })
})
