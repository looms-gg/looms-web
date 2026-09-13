import { replaceCatalog } from "../data/catalog"
import { fixturePieces } from "../data/catalogSeed"

// @ts-expect-error react act flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

if (typeof window !== "undefined") {
  const store = new Map<string, string>()
  const memoryStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    get length() {
      return store.size
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  }

  const storage =
    window.localStorage && typeof window.localStorage.clear === "function"
      ? window.localStorage
      : (memoryStorage as unknown as Storage)

  if (!window.localStorage || typeof window.localStorage.clear !== "function") {
    Object.defineProperty(window, "localStorage", {
      value: storage,
      writable: true,
      configurable: true,
    })
  }

  if (
    !globalThis.localStorage ||
    typeof (globalThis as unknown as { localStorage: Storage }).localStorage?.clear !== "function"
  ) {
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      writable: true,
      configurable: true,
    })
  }
}

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
          width: w,
          height: h,
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
