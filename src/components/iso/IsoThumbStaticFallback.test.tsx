import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { pieces } from "../../data/catalog"
import { IsoThumb } from "./IsoThumb"

vi.mock("./isoStatic", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  staticIsoThumbUrl: () => "/iso/pieces/static-test.png",
}))

const dynamicThumb = vi.fn(async () => ({
  url: "data:image/png;base64,AAAA",
  wash: "oklch(0.9 0.02 200)",
}))
vi.mock("../../skin/iso", () => ({
  isoPieceThumb: dynamicThumb,
  isoOutfitThumb: dynamicThumb,
}))

// The static object is gone (404): the tile must fall through to the live
// render pipeline instead of holding the skeleton forever.
vi.stubGlobal(
  "fetch",
  vi.fn(async () => ({ ok: false, status: 404 })),
)

describe("IsoThumb static fallback", () => {
  it("renders through the dynamic path when the static PNG is missing", async () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<IsoThumb piece={pieces[0]} alt="x" priority />)
    })
    await vi.waitFor(() => {
      const fill = host.querySelector(".iso-thumb-fill") as HTMLElement
      expect(fill.classList.contains("thumb-in")).toBe(true)
      expect(fill.style.backgroundImage).toContain("data:image/png;base64,AAAA")
    })
    expect(document.querySelector(".skin-bone")).toBeNull()
  })
})
