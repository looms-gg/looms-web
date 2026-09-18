import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { pieces } from "../../data/catalog"
import { IsoThumb } from "./IsoThumb"

vi.mock("../../data/isoStaticThumbs.json", () => ({
  default: { baked: [pieces[0].id] },
}))

vi.mock("./isoStatic", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  staticIsoThumbUrl: () => "/iso/pieces/static-test.png",
}))

// The render pipeline must never load on the static path.
vi.mock("../../skin/iso", () => {
  throw new Error("render pipeline must not load for static thumbs")
})

// IndexedDB is unavailable in happy-dom; the cache read misses and the fetch
// path runs.
vi.stubGlobal("fetch", vi.fn(async () => ({
  ok: true,
  blob: async () => new Blob(["png"], { type: "image/png" }),
})))

describe("IsoThumb static path", () => {
  it("serves the baked PNG without the render pipeline", async () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<IsoThumb piece={pieces[0]} alt="x" priority />)
    })
    await vi.waitFor(() => {
      const fill = host.querySelector(".iso-thumb-fill") as HTMLElement
      expect(fill.style.backgroundImage).toContain("blob:")
    })
    expect(document.querySelector(".skin-bone")).toBeNull()
  })
})
