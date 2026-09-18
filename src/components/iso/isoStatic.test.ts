import { describe, expect, it, vi } from "vitest"

vi.mock("../../data/isoStaticThumbs.json", () => ({ default: { baked: ["seed-piece"] } }))

describe("staticIsoThumbUrl", () => {
  it("prefers the DB thumb_url over the seed manifest", async () => {
    const { staticIsoThumbUrl } = await import("./isoStatic")
    expect(staticIsoThumbUrl({ id: "seed-piece", thumb: "https://x/y.png" })).toBe("https://x/y.png")
  })

  it("resolves seed manifest hits through the app base path", async () => {
    const { staticIsoThumbUrl } = await import("./isoStatic")
    expect(staticIsoThumbUrl({ id: "seed-piece" })).toBe("/iso/pieces/seed-piece.png")
    expect(staticIsoThumbUrl({ id: "unknown" })).toBeNull()
  })
})
