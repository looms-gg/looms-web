import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { ISO_RIM_FILL, IsoFigureFx } from "./IsoFigureFx"

describe("IsoFigureFx", () => {
  it("exports the silhouette filter", () => {
    expect(typeof IsoFigureFx).toBe("function")
  })

  it("paints the rim with off-white instead of pure white", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<IsoFigureFx />)
    })
    const flood = host.querySelector("#iso-hard-white feFlood")
    expect(flood?.getAttribute("flood-color") ?? flood?.getAttribute("floodColor")).toBe(
      ISO_RIM_FILL,
    )
    expect(ISO_RIM_FILL.toLowerCase()).not.toBe("#ffffff")
    expect(ISO_RIM_FILL.toLowerCase()).not.toBe("#fff")
  })
})
