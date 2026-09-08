import { rgbToOklab } from "./hue"

const PASTEL_L = 0.91
const PASTEL_C = 0.055
const FALLBACK = `oklch(${PASTEL_L} 0.028 250)`
const cache = new Map<string, string>()

function hueDeg(a: number, b: number) {
  const deg = (Math.atan2(b, a) * 180) / Math.PI
  return deg < 0 ? deg + 360 : deg
}

export function complementaryPastel(r: number, g: number, b: number) {
  const lab = rgbToOklab(r, g, b)
  const chroma = Math.hypot(lab.a, lab.b)
  if (chroma < 0.012) {
    return lab.L < 0.45 ? `oklch(${PASTEL_L} 0.042 85)` : `oklch(${PASTEL_L} 0.032 245)`
  }
  const h = (hueDeg(lab.a, lab.b) + 180) % 360
  return `oklch(${PASTEL_L} ${PASTEL_C} ${h.toFixed(1)})`
}

export function washFromPixels(data: Uint8ClampedArray) {
  const buckets = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 48) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lab = rgbToOklab(r, g, b)
    const chroma = Math.hypot(lab.a, lab.b)
    if (chroma < 0.02) continue
    const bucket = Math.min(23, Math.floor(hueDeg(lab.a, lab.b) / 15))
    const w = chroma * (a / 255)
    const slot = buckets[bucket]
    slot.w += w
    slot.r += r * w
    slot.g += g * w
    slot.b += b * w
  }
  let best = buckets[0]
  for (const slot of buckets) {
    if (slot.w > best.w) best = slot
  }
  if (best.w >= 0.12) {
    return complementaryPastel(best.r / best.w, best.g / best.w, best.b / best.w)
  }
  let n = 0
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 48) continue
    n += 1
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  if (n === 0) return FALLBACK
  return complementaryPastel(r / n, g / n, b / n)
}

export function washFromCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext("2d")
  if (!ctx) return FALLBACK
  try {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return washFromPixels(data)
  } catch {
    return FALLBACK
  }
}

export function washFromImageUrl(url: string) {
  const hit = cache.get(url)
  if (hit) return Promise.resolve(hit)
  return new Promise<string>((resolve) => {
    const img = new Image()
    if (/^https?:/i.test(url)) img.crossOrigin = "anonymous"
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const w = Math.max(1, img.naturalWidth || img.width)
      const h = Math.max(1, img.naturalHeight || img.height)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(FALLBACK)
        return
      }
      ctx.drawImage(img, 0, 0)
      const wash = washFromPixels(ctx.getImageData(0, 0, w, h).data)
      cache.set(url, wash)
      resolve(wash)
    }
    img.onerror = () => resolve(FALLBACK)
    img.src = url
  })
}
