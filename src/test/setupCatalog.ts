import { replaceCatalog } from "../data/catalog"
import { fixturePieces } from "../data/catalogSeed"

// @ts-expect-error react act flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

if (typeof HTMLCanvasElement !== "undefined") {
  const origGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
    const ctx = origGetContext ? origGetContext.call(this, type, ...args) : null
    if (ctx) return ctx
    if (type === "2d") {
      return {
        imageSmoothingEnabled: false,
        clearRect: () => {},
        drawImage: () => {},
        getImageData: (_x: number, _y: number, w = 64, h = 64) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: () => {},
        createImageData: (w = 64, h = 64) => ({
          data: new Uint8ClampedArray(w * h * 4),
        }),
        fillRect: () => {},
      } as unknown as CanvasRenderingContext2D
    }
    return null
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
}

replaceCatalog(fixturePieces())
