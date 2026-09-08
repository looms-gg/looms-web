/** OKLCH hue rotate that keeps skin lightness and tames chroma at far hues. */

function srgbToLinear(c: number) {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c: number) {
  const x = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, x)) * 255)
}

export function rgbToOklab(r: number, g: number, b: number) {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

function oklabToRgb(L: number, a: number, b: number) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

/** Far shifts get a little less chroma so skin doesn’t go neon. */
function chromaScale(shift: number) {
  return 1 - 0.32 * Math.min(1, Math.abs(shift) / 120)
}

export function shiftRgb(r: number, g: number, b: number, shift: number) {
  if (shift === 0) return { r, g, b }
  const lab = rgbToOklab(r, g, b)
  const c = Math.hypot(lab.a, lab.b)
  if (c < 0.004) return { r, g, b }
  const h = Math.atan2(lab.b, lab.a) + (shift * Math.PI) / 180
  const next = c * chromaScale(shift)
  return oklabToRgb(lab.L, Math.cos(h) * next, Math.sin(h) * next)
}

export function shiftHex(hex: string, shift: number) {
  const h = hex.replace("#", "")
  const n = Number.parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16)
  const { r, g, b } = shiftRgb((n >> 16) & 255, (n >> 8) & 255, n & 255, shift)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`
}

export function shiftImageData(image: ImageData, shift: number) {
  if (shift === 0) return image
  const next = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height)
  const { data } = next
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue
    const rgb = shiftRgb(data[i], data[i + 1], data[i + 2], shift)
    data[i] = rgb.r
    data[i + 1] = rgb.g
    data[i + 2] = rgb.b
  }
  return next
}

export function hueRamp(hex: string, min = -120, max = 120, steps = 9) {
  const stops: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const shift = min + (max - min) * t
    stops.push(`${shiftHex(hex, shift)} ${t * 100}%`)
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

export const HUE_MIN = -120
export const HUE_MAX = 120
