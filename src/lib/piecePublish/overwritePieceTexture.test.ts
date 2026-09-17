import { describe, it, expect, vi, beforeEach } from "vitest"
import type { GarmentRow } from "../../data/garment"

const upload = vi.fn()
const update = vi.fn()
const updateEq = vi.fn()
const garmentSingle = vi.fn()
const profileSingle = vi.fn()

vi.mock("../../lib/supabase", () => {
  return {
    supabase: {
      storage: {
        from: () => ({
          upload,
          getPublicUrl: () => ({
            data: { publicUrl: "https://cdn.example.test/garments/u1/p1.png" },
          }),
        }),
      },
      from: (table: string) => {
        if (table === "profiles") {
          return { select: () => ({ eq: () => ({ single: profileSingle }) }) }
        }
        return {
          update,
          select: () => ({ eq: () => ({ single: garmentSingle }) }),
        }
      },
    },
  }
})

import { overwritePieceTexture } from "./overwritePieceTexture"

const row: GarmentRow = {
  id: "p1",
  user_id: "u1",
  name: "Cozy Shirt",
  description: null,
  slot: "shirt",
  body_group: "torso",
  saved_count: 3,
  like_count: 2,
  added: 123,
  covers: ["torso"],
  texture_url: "https://cdn.example.test/garments/u1/p1.png",
  is_public: true,
  tags: [],
  created_at: "2026-01-01T00:00:00Z",
}

describe("overwritePieceTexture", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upload.mockResolvedValue({ error: null })
    update.mockReturnValue({ eq: updateEq })
    updateEq.mockResolvedValue({ error: null })
    garmentSingle.mockImplementation(() => {
      const busted = update.mock.calls[0]?.[0]?.texture_url ?? row.texture_url
      return Promise.resolve({
        data: { ...row, covers: ["torso", "legs"], texture_url: busted },
        error: null,
      })
    })
    profileSingle.mockResolvedValue({ data: { username: "maker" }, error: null })
  })

  it("uploads to the owner path with upsert and updates the row", async () => {
    const blob = new Blob(["png"], { type: "image/png" })
    const result = await overwritePieceTexture({
      userId: "u1",
      pieceId: "p1",
      slot: "shirt",
      textureBlob: blob,
      painted: ["torso", "legs"],
    })

    expect("error" in result).toBe(false)
    expect(upload).toHaveBeenCalledWith("u1/p1.png", blob, {
      contentType: "image/png",
      upsert: true,
    })
    const updateArg = update.mock.calls[0][0]
    expect(updateArg.covers).toEqual(["torso", "legs"])
    expect(updateArg.texture_url).toMatch(
      /^https:\/\/cdn\.example\.test\/garments\/u1\/p1\.png\?v=\d+$/,
    )
    expect("piece" in result && result.piece.skin).toContain("?v=")
  })

  it("returns a friendly error when storage rejects the overwrite", async () => {
    upload.mockResolvedValue({ error: { message: "storage quota" } })
    const result = await overwritePieceTexture({
      userId: "u1",
      pieceId: "p1",
      slot: "shirt",
      textureBlob: new Blob(["png"], { type: "image/png" }),
      painted: ["torso"],
    })
    expect("error" in result).toBe(true)
  })

  it("returns a friendly error when the row update fails", async () => {
    updateEq.mockResolvedValue({ error: { message: "row locked" } })
    const result = await overwritePieceTexture({
      userId: "u1",
      pieceId: "p1",
      slot: "shirt",
      textureBlob: new Blob(["png"], { type: "image/png" }),
      painted: ["torso"],
    })
    expect("error" in result).toBe(true)
  })
})
