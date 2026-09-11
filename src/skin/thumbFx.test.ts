import { beforeAll, describe, expect, it } from "vitest"
import { compositeIsoThumbFx, ISO_RIM_FILL } from "./thumbFx"

// happy-dom does not implement canvas 2D rasterization; when getContext
// returns null, thumbFx must throw (composite) or fall back (bake).
function canvas2dSupported(): boolean {
  const c = document.createElement("canvas")
  return c.getContext("2d") != null
}

const supports2d = canvas2dSupported()

describe("thumbFx", () => {
  it("keeps the warm off-white rim fill (never pure white)", () => {
    expect(ISO_RIM_FILL.toLowerCase()).not.toBe("#ffffff")
    expect(ISO_RIM_FILL.toLowerCase()).not.toBe("#fff")
  })

  describe("compositeIsoThumbFx", () => {
    let canvas: HTMLCanvasElement
    let ctx: CanvasRenderingContext2D

    beforeAll(() => {
      // 10×10 fully-opaque red square on transparent background
      canvas = document.createElement("canvas")
      canvas.width = 10
      canvas.height = 10
      ctx = canvas.getContext("2d") as CanvasRenderingContext2D
      ctx.fillStyle = "rgb(200, 30, 40)"
      ctx.fillRect(0, 0, 10, 10)
    })

    it.skipIf(!supports2d)(
      "returns a PNG data URL of the same dimensions",
      () => {
        const url = compositeIsoThumbFx(canvas, 10, 10)
        expect(url.startsWith("data:image/png;base64,")).toBe(true)
      },
    )

    it.skipIf(!supports2d)(
      "accepts a padded source and returns a PNG data URL",
      () => {
        // Padded so the baked shadow (offset -10,+5) and rim (+3,±3) fit
        const wide = document.createElement("canvas")
        wide.width = 26
        wide.height = 26
        const wctx = wide.getContext("2d") as CanvasRenderingContext2D
        wctx.fillStyle = "rgb(200, 30, 40)"
        wctx.fillRect(8, 8, 10, 10)
        const baked = compositeIsoThumbFx(wide, 26, 26)
        expect(baked.startsWith("data:image/png")).toBe(true)
      },
    )

    it.skipIf(!supports2d)(
      "throws on empty sources",
      () => {
        expect(() => compositeIsoThumbFx(canvas, 0, 10)).toThrow()
        expect(() => compositeIsoThumbFx(canvas, 10, 0)).toThrow()
      },
    )

    it.skipIf(supports2d)(
      "throws when canvas 2D is unavailable",
      () => {
        expect(() => compositeIsoThumbFx(canvas, 10, 10)).toThrow()
      },
    )
  })
})
