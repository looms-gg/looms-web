import { beforeEach, describe, expect, it, vi } from "vitest"

const upload = vi.fn().mockResolvedValue({ error: null })
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.test/g/u1/p1.thumb.png" } }))
vi.mock("../../lib/supabase", () => ({
  supabase: { storage: { from: () => ({ upload, getPublicUrl }) } },
}))

// The render pipeline is dynamically imported by thumbUpload; fail loudly in
// a control test and return a real-shaped result otherwise.
const isoPieceThumb = vi.fn(async () => ({
  url: "data:image/png;base64,AAAA",
  wash: "",
}))
vi.mock("../../skin/iso", () => ({ isoPieceThumb }))

import { bakeAndUploadThumb } from "./thumbUpload"

const client = { storage: { from: () => ({ upload, getPublicUrl }) } } as never

const piece = {
  id: "p1", name: "Shirt", slot: "shirt" as const, group: "torso" as const,
  maker: "maker", savedCount: 0, likeCount: 0, added: 0, blurb: "",
  skin: "https://cdn.test/garments/u1/p1.png",
}

describe("bakeAndUploadThumb", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upload.mockResolvedValue({ error: null })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(["png"], { type: "image/png" }),
    })))
  })

  it("uploads a thumb to the owner path with long cache control", async () => {
    const url = await bakeAndUploadThumb(client, "u1", "p1", piece)
    expect(url).toBe("https://cdn.test/g/u1/p1.thumb.png")
    expect(upload).toHaveBeenCalledWith(
      "u1/p1.thumb.png",
      expect.any(Blob),
      { contentType: "image/png", cacheControl: "31536000", upsert: true },
    )
  })

  it("returns null when the render pipeline fails (best-effort)", async () => {
    isoPieceThumb.mockRejectedValueOnce(new Error("no webgl"))
    expect(await bakeAndUploadThumb(client, "u1", "p1", piece)).toBeNull()
    expect(upload).not.toHaveBeenCalled()
  })

  it("returns null when storage rejects the upload", async () => {
    upload.mockResolvedValueOnce({ error: { message: "quota" } })
    expect(await bakeAndUploadThumb(client, "u1", "p1", piece)).toBeNull()
  })
})
