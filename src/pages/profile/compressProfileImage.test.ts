import { afterEach, describe, expect, it, vi } from "vitest"
import {
  compressProfileImage,
  fitAvatarDraw,
  fitBannerSize,
  AVATAR_MAX,
  BANNER_MAX_W,
  BANNER_MAX_H,
} from "./compressProfileImage"

describe("fitAvatarDraw", () => {
  it("cover-crops a wide image to a square source then caps at AVATAR_MAX", () => {
    const draw = fitAvatarDraw(2000, 1000)
    expect(draw.sw).toBe(1000)
    expect(draw.sh).toBe(1000)
    expect(draw.sx).toBe(500)
    expect(draw.sy).toBe(0)
    expect(draw.dw).toBe(AVATAR_MAX)
    expect(draw.dh).toBe(AVATAR_MAX)
  })

  it("does not upscale small squares", () => {
    const draw = fitAvatarDraw(200, 200)
    expect(draw.dw).toBe(200)
    expect(draw.dh).toBe(200)
    expect(draw.sw).toBe(200)
    expect(draw.sh).toBe(200)
  })
})

describe("fitBannerSize", () => {
  it("scales down to fit within banner max box without upscaling", () => {
    expect(fitBannerSize(3000, 1000)).toEqual({
      dw: BANNER_MAX_W,
      dh: Math.round(BANNER_MAX_W * (1000 / 3000)),
    })
  })

  it("leaves small banners unchanged", () => {
    expect(fitBannerSize(800, 200)).toEqual({ dw: 800, dh: 200 })
  })

  it("respects height cap for tall banners", () => {
    const size = fitBannerSize(1000, 2000)
    expect(size.dh).toBe(BANNER_MAX_H)
    expect(size.dw).toBe(Math.round(BANNER_MAX_H * (1000 / 2000)))
  })
})

describe("compressProfileImage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns a webp file under the avatar target when encoding succeeds", async () => {
    const bitmap = {
      width: 800,
      height: 600,
      close: vi.fn(),
    } as unknown as ImageBitmap
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => bitmap),
    )

    const toBlob = vi.fn((cb: BlobCallback) => {
      cb(new Blob([new Uint8Array(40 * 1024)], { type: "image/webp" }))
    })
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob as never)
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,xx")

    const input = new File([new Uint8Array(500 * 1024)], "big.png", { type: "image/png" })
    const out = await compressProfileImage(input, "avatar")

    expect(out.type).toBe("image/webp")
    expect(out.name).toBe("avatar.webp")
    expect(out.size).toBeLessThanOrEqual(100 * 1024)
    expect(toBlob).toHaveBeenCalled()
  })
})
