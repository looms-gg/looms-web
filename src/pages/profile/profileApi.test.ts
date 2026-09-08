import { describe, expect, it } from "vitest"
import type { GarmentRow, LookRow } from "../../lib/supabase"
import { orderLikedTargets } from "./profileApi"

const garment = (id: string): GarmentRow =>
  ({
    id,
    user_id: "u1",
    name: id,
    description: null,
    slot: "shirt",
    body_group: "torso",
    saved_count: 0,
    like_count: 0,
    added: 0,
    covers: [],
    texture_url: "https://example.com/a.png",
    is_public: true,
    tags: [],
    created_at: "",
  }) as GarmentRow

const look = (id: string): LookRow =>
  ({
    id,
    user_id: "u1",
    name: id,
    description: "",
    visibility: "public",
    stack: [],
    body_id: "steve",
    body_hue: 0,
    model: "classic",
    created_at: "",
    updated_at: "",
  }) as LookRow

describe("orderLikedTargets", () => {
  it("keeps like order and drops missing targets", () => {
    const result = orderLikedTargets(
      [
        { target_type: "look", target_id: "l2" },
        { target_type: "garment", target_id: "g1" },
        { target_type: "garment", target_id: "missing" },
      ],
      [garment("g1"), garment("g9")],
      [look("l2")],
    )

    expect(result.order).toEqual([
      { target_type: "look", target_id: "l2" },
      { target_type: "garment", target_id: "g1" },
    ])
    expect(result.garments.map((g) => g.id)).toEqual(["g1"])
    expect(result.looks.map((l) => l.id)).toEqual(["l2"])
  })
})
