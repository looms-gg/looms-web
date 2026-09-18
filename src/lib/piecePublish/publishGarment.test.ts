import { beforeEach, describe, expect, it, vi } from "vitest"

const upload = vi.fn().mockResolvedValue({ error: null })
const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "u" } })
const insert = vi.fn().mockResolvedValue({ error: null })
const updateRow = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
})

vi.mock("../../lib/supabase", () => ({
  supabase: {
    storage: { from: () => ({ upload, getPublicUrl }) },
    from: () => ({ insert, update: updateRow }),
  },
  GarmentRow: {},
}))

const isoPieceThumb = vi.fn(async () => ({
  url: "data:image/png;base64,AAAA",
  wash: "",
}))
vi.mock("../../skin/iso", () => ({ isoPieceThumb }))

import { publishGarmentTexture } from "./publishGarment"

describe("publishGarmentTexture", () => {
  const base = {
    userId: "u1",
    username: "pyre",
    textureBlob: new Blob(["x"], { type: "image/png" }),
    name: "Test  Piece",
    description: "desc",
    slot: "shirt" as const,
    isPublic: true,
    painted: ["torso" as const],
  }

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(["png"], { type: "image/png" }),
    })))
  })

  it("uploads to the scoped path and inserts with computed covers", async () => {
    const result = await publishGarmentTexture(base)
    expect("pieceId" in result).toBe(true)
    const path = upload.mock.calls[0][0] as string
    expect(path.startsWith("u1/")).toBe(true)
    expect(path.endsWith(".png")).toBe(true)
    expect(insert.mock.calls[0][0].covers).toContain("torso")
    expect(insert.mock.calls[0][0].name).toBe("Test  Piece")
  })

  it("returns an error shape when storage fails", async () => {
    upload.mockResolvedValueOnce({ error: { message: "nope" } })
    const result = await publishGarmentTexture(base)
    expect(result).toEqual({ error: expect.any(Error) })
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it("sets thumb_url after publishing", async () => {
    const result = await publishGarmentTexture(base)
    expect("pieceId" in result).toBe(true)
    const thumbCall = upload.mock.calls.find((c) => String(c[0]).endsWith(".thumb.png"))
    expect(thumbCall).toBeTruthy()
    expect(insert.mock.calls[0][0].thumb_url).toBeNull() // insert stays null; column set after
    const thumbPatch = updateRow.mock.calls.at(-1)?.[0] as { thumb_url?: string }
    expect(thumbPatch?.thumb_url).toBe("u")
  })

  it("still publishes when the thumb bake fails", async () => {
    isoPieceThumb.mockRejectedValueOnce(new Error("no webgl"))
    const result = await publishGarmentTexture(base)
    expect("pieceId" in result).toBe(true)
  })
})
