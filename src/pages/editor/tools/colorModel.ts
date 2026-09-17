export type Hsv = { h: number; s: number; v: number }

const HEX_RE = /^#?([0-9a-fA-F]{6})$/

export function hexToHsv(hex: string): Hsv {
  const clean = normalizeHex(hex) ?? "#000000"
  const r = parseInt(clean.slice(1, 3), 16) / 255
  const g = parseInt(clean.slice(3, 5), 16) / 255
  const b = parseInt(clean.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }

  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const hh = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = v - c

  let rr = 0
  let gg = 0
  let bb = 0
  if (hh < 60) [rr, gg, bb] = [c, x, 0]
  else if (hh < 120) [rr, gg, bb] = [x, c, 0]
  else if (hh < 180) [rr, gg, bb] = [0, c, x]
  else if (hh < 240) [rr, gg, bb] = [0, x, c]
  else if (hh < 300) [rr, gg, bb] = [x, 0, c]
  else [rr, gg, bb] = [c, 0, x]

  const to255 = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0")

  return `#${to255(rr)}${to255(gg)}${to255(bb)}`
}

export function normalizeHex(input: string): string | null {
  const match = input.trim().match(HEX_RE)
  if (!match) return null
  return `#${match[1].toLowerCase()}`
}

const SKIN_TONES = [
  "#f9e0d0",
  "#eabfa0",
  "#d7a37a",
  "#b9825a",
  "#99683e",
  "#7a4f2c",
  "#59371c",
  "#3b2212",
]

export const PICKER_PRESETS = [
  ...SKIN_TONES,
  "#ffffff",
  "#000000",
  "#4b5563",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#78350f",
]
