import { afterEach, describe, expect, it, vi } from "vitest"
import { composeSkin } from "./compose"
import { fixturePieces } from "../data/catalogSeed"

// composeSkin rasterizes via loadSkinImage (new Image()). happy-dom never
// fires a real image load, so this stub resolves onload on the next
// microtask; the canvas shim in src/test/setupCatalog.ts supplies the 2d
// context behind the scenes.
class MockImage {
  decoding = "async"
  crossOrigin: string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private _src = ""
  set src(value: string) {
    this._src = value
    queueMicrotask(() => this.onload?.())
  }
  get src() {
    return this._src
  }
  get width() {
    return 64
  }
  get height() {
    return 64
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("composeSkin", () => {
  it("returns the same canvas for an identical request (cache hit)", async () => {
    vi.stubGlobal("Image", MockImage)
    const pieces = fixturePieces().slice(0, 2)
    const first = await composeSkin(pieces, "body-1", 0, "classic")
    const second = await composeSkin(pieces, "body-1", 0, "classic")
    expect(first).toBe(second)
  })

  it("returns a distinct canvas for a different outfit", async () => {
    vi.stubGlobal("Image", MockImage)
    const [p1, p2] = fixturePieces()
    const a = await composeSkin([p1], "body-1", 0, "classic")
    const b = await composeSkin([p1, p2], "body-1", 0, "classic")
    expect(a).not.toBe(b)
  })

  it("composes slim and hue-shifted variants without throwing", async () => {
    vi.stubGlobal("Image", MockImage)
    const pieces = fixturePieces().slice(0, 2)
    const slim = await composeSkin(pieces, "body-2", 120, "slim")
    expect(slim).toBeInstanceOf(HTMLCanvasElement)
    const classic = await composeSkin(pieces, "body-2", 120, "classic")
    expect(classic).not.toBe(slim)
  })

  it("evicts the oldest entry once the cache cap is exceeded", async () => {
    vi.stubGlobal("Image", MockImage)
    // One initial key plus 60 unique hue keys exceeds COMPOSED_CACHE_MAX (48).
    const first = await composeSkin([], "body-1", 0, "classic")
    for (let hue = 1; hue <= 60; hue++) {
      await composeSkin([], "body-1", hue, "classic")
    }
    const again = await composeSkin([], "body-1", 0, "classic")
    expect(again).not.toBe(first)
  })
})
