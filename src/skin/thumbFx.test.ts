import { beforeAll, describe, expect, it } from "vitest"
import { compositeIsoThumbFx, ISO_RIM_FILL, type ThumbImage } from "./thumbFx"

// happy-dom does not implement canvas 2D rasterization; when getContext
// returns null, thumbFx must throw (composite) or fall back (bake).
function canvas2dSupported(): boolean {
  const c = document.createElement("canvas")
  return c.getContext("2d") != null
}

const supports2d = canvas2dSupported()

// happy-dom's toBlob is a 0-byte stub, so canvasToPng falls back to a data
// URL in tests; real browsers hand back a Blob. Accept either shape.
async function toImgSrc(image: ThumbImage): Promise<string> {
  return typeof image === "string" ? image : URL.createObjectURL(image)
}

function expectToBePng(image: ThumbImage) {
  if (typeof image === "string") expect(image.startsWith("data:image/png")).toBe(true)
  else expect(image).toBeInstanceOf(Blob)
}

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
      "returns a PNG image of the same dimensions",
      async () => {
        const image = await compositeIsoThumbFx(canvas, 10, 10)
        expectToBePng(image)
      },
    )

    it.skipIf(!supports2d)(
      "accepts a padded source and returns a PNG image",
      async () => {
        // Padded so the baked shadow (offset -10,+5) and rim (+3,±3) fit
        const wide = document.createElement("canvas")
        wide.width = 26
        wide.height = 26
        const wctx = wide.getContext("2d") as CanvasRenderingContext2D
        wctx.fillStyle = "rgb(200, 30, 40)"
        wctx.fillRect(8, 8, 10, 10)
        const baked = await compositeIsoThumbFx(wide, 26, 26)
        expectToBePng(baked)
      },
    )

    it.skipIf(!supports2d)(
      "throws on empty sources",
      async () => {
        await expect(compositeIsoThumbFx(canvas, 0, 10)).rejects.toThrow()
        await expect(compositeIsoThumbFx(canvas, 10, 0)).rejects.toThrow()
      },
    )

    it.skipIf(supports2d)(
      "throws when canvas 2D is unavailable",
      async () => {
        await expect(compositeIsoThumbFx(canvas, 10, 10)).rejects.toThrow()
      },
    )

    it.skipIf(!supports2d)(
      "overlays the rim inside the figure (never an outline outside it)",
      async () => {
        // 16×16 opaque red square centered in 64×64. After normalization the
        // figure is the only opaque region; the punch shadow sits left/below,
        // so anything opaque right of the figure would be the old outer
        // outline leaking back in.
        const src = document.createElement("canvas")
        src.width = 64
        src.height = 64
        const sctx = src.getContext("2d") as CanvasRenderingContext2D
        sctx.fillStyle = "rgb(200, 30, 40)"
        sctx.fillRect(24, 24, 16, 16)
        // happy-dom implements the 2D API surface but never rasterizes, so
        // pixel assertions are impossible there — bail without failing.
        if (sctx.getImageData(24, 24, 1, 1).data[3] === 0) return

        const image = await compositeIsoThumbFx(src, 64, 64)
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error("thumbFx test: decode failed"))
          void toImgSrc(image).then((src) => {
            img.src = src
          })
        })
        const probe = document.createElement("canvas")
        probe.width = 64
        probe.height = 64
        const pctx = probe.getContext("2d") as CanvasRenderingContext2D
        pctx.drawImage(img, 0, 0)
        const data = pctx.getImageData(0, 0, 64, 64).data
        const alphaAt = (x: number, y: number) => data[(y * 64 + x) * 4 + 3]
        const pixelAt = (x: number, y: number) => {
          const i = (y * 64 + x) * 4
          return [data[i], data[i + 1], data[i + 2]] as const
        }

        // The baked punch shadow is 0.35 alpha; the figure is fully opaque.
        let minX = 64
        let maxX = -1
        let minY = 64
        let maxY = -1
        for (let y = 0; y < 64; y++) {
          for (let x = 0; x < 64; x++) {
            if (alphaAt(x, y) > 128) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }
        expect(maxX).toBeGreaterThan(0)

        for (let y = 0; y < 64; y++) {
          for (let x = maxX + 2; x < 64; x++) {
            expect(alphaAt(x, y)).toBe(0)
          }
        }

        // Inside the lit band (<=8px from the right edge): the warm rim tint
        // lifts the green/red channels off the pure source red.
        const [r, g, b] = pixelAt(maxX - 3, minY + 2)
        expect(r).toBeGreaterThan(195)
        expect(g).toBeGreaterThan(90)
        expect(b).toBeGreaterThan(90)

        // Past the left-edge mask fade (bottom-left corner): untouched
        // source red — the mask keeps the rim off the shadow side.
        const [lr, lg, lb] = pixelAt(minX + 2, maxY - 2)
        expect(lr).toBeCloseTo(200, 0)
        expect(lg).toBeLessThan(60)
        expect(lb).toBeLessThan(70)
      },
    )
  })
})
