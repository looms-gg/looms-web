import { beforeEach, describe, expect, it, vi } from "vitest"

const upload = vi.fn().mockResolvedValue({ error: null })
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://cdn.test/g/u1/l1.thumb.png" } }))
vi.mock("../../lib/supabase", () => ({
  supabase: { storage: { from: () => ({ upload, getPublicUrl }) } },
}))

// The render pipeline is dynamically imported by lookThumbUpload; return a
// real-shaped result so the upload path is exercised.
const isoOutfitThumb = vi.fn(async () => ({
  url: "data:image/png;base64,AAAA",
  wash: "",
}))
vi.mock("../../skin/iso", () => ({ isoOutfitThumb }))

import { bakeAndUploadLookThumb } from "./lookThumbUpload"

const client = { storage: { from: () => ({ upload, getPublicUrl }) } } as never

const piece = {
  id: "p1", name: "Shirt", slot: "shirt" as const, group: "torso" as const,
  maker: "maker", savedCount: 0, likeCount: 0, added: 0, blurb: "",
  skin: "https://cdn.test/garments/u1/p1.png",
}

describe("bakeAndUploadLookThumb", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upload.mockResolvedValue({ error: null })
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(["png"], { type: "image/png" }),
    })))
  })

  it("uploads a thumb to the owner path with long cache control", async () => {
    const url = await bakeAndUploadLookThumb(
      client, "u1", "l1", [piece as never], "slate", 0, "classic",
    )
    expect(url).toBe("https://cdn.test/g/u1/l1.thumb.png")
    expect(upload).toHaveBeenCalledWith(
      "u1/l1.thumb.png",
      expect.any(Blob),
      { contentType: "image/png", cacheControl: "31536000", upsert: true },
    )
  })

  it("skips empty stacks (best-effort, no upload)", async () => {
    expect(await bakeAndUploadLookThumb(client, "u1", "l1", [], "slate", 0, "classic")).toBeNull()
    expect(upload).not.toHaveBeenCalled()
  })

  it("returns null when the render pipeline fails (best-effort)", async () => {
    isoOutfitThumb.mockRejectedValueOnce(new Error("no webgl"))
    expect(
      await bakeAndUploadLookThumb(client, "u1", "l1", [piece as never], "slate", 0, "classic"),
    ).toBeNull()
    expect(upload).not.toHaveBeenCalled()
  })

  it("returns null when storage rejects the upload", async () => {
    upload.mockResolvedValueOnce({ error: { message: "quota" } })
    expect(
      await bakeAndUploadLookThumb(client, "u1", "l1", [piece as never], "slate", 0, "classic"),
    ).toBeNull()
  })
})
