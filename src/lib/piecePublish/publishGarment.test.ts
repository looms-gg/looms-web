import { describe, expect, it, vi } from "vitest"

const upload = vi.fn().mockResolvedValue({ error: null })
const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "u" } })
const insert = vi.fn().mockResolvedValue({ error: null })

vi.mock("../../lib/supabase", () => ({
  supabase: {
    storage: { from: () => ({ upload, getPublicUrl }) },
    from: () => ({ insert }),
  },
  GarmentRow: {},
}))

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
})
