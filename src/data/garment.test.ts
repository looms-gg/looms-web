import { describe, expect, it } from "vitest"
import { garmentToPiece, type GarmentRow } from "./garment"

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
  thumb_url: null,
  is_public: true,
  tags: [],
  created_at: "2026-09-07T00:00:00.000Z",
}

describe("garmentToPiece", () => {
  it("maps a garment row onto a wardrobe piece", () => {
    const piece = garmentToPiece(row, "PyreDev")
    expect(piece.id).toBe("ink-fall")
    expect(piece.maker).toBe("PyreDev")
    expect(piece.group).toBe("head")
    expect(piece.covers).toEqual(["head", "torso"])
    expect(piece.skin).toBe(row.texture_url)
    expect(piece.blurb).toBe("Long black hair.")
    expect(piece.savedCount).toBe(33)
    expect(piece.likeCount).toBe(4)
    expect(piece).not.toHaveProperty("worn")
  })

  it("maps thumb_url onto the piece", () => {
    const withThumb = garmentToPiece(
      { ...row, thumb_url: "https://example.test/ink-fall.thumb.png?v=1" },
      "loft",
    )
    expect(withThumb.thumb).toBe("https://example.test/ink-fall.thumb.png?v=1")
    const withoutThumb = garmentToPiece({ ...row, thumb_url: null }, "loft")
    expect(withoutThumb.thumb).toBeUndefined()
  })
})
