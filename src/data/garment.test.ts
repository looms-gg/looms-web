import { describe, expect, it } from "vitest"
import { garmentToPiece } from "./garment"
import type { GarmentRow } from "../lib/supabase"

const row: GarmentRow = {
  id: "ink-fall",
  user_id: "45e6be54-c9a5-4627-af39-9c14b27ec92e",
  name: "Ink Fall",
  description: "Long black hair.",
  slot: "hair",
  body_group: "head",
  saved_count: 33,
  like_count: 4,
  added: 19,
  covers: ["head", "torso"],
  texture_url: "https://example.test/ink-fall.png",
  is_public: true,
  tags: [],
  created_at: "2026-09-07T00:00:00.000Z",
}

describe("garmentToPiece", () => {
  it("maps a garment row onto a wardrobe piece", () => {
    const piece = garmentToPiece(row, "ser0th")
    expect(piece.id).toBe("ink-fall")
    expect(piece.maker).toBe("ser0th")
    expect(piece.group).toBe("head")
    expect(piece.covers).toEqual(["head", "torso"])
    expect(piece.skin).toBe(row.texture_url)
    expect(piece.blurb).toBe("Long black hair.")
    expect(piece.savedCount).toBe(33)
    expect(piece.likeCount).toBe(4)
    expect(piece).not.toHaveProperty("worn")
  })
})
