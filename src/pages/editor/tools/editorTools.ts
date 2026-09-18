import { CUBOID_FACES, type Rect } from "../../../skin/uv"
import {
  CUBOIDS_CLASSIC,
  CUBOIDS_SLIM,
  findCuboidAtTexel,
  findCuboidFaceAtTexel,
  type Point,
} from "./editorMath"

export type RgbaColor = [number, number, number, number]

export type BrushShape = "square" | "circle"

export type BrushBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "lighten"
  | "darken"
  | "overlay"

export interface BrushOptions {
  shape?: BrushShape
  opacity?: number
  softness?: number
  blend?: BrushBlendMode
  clip?: Rect
  // Stroke callers paint inside their own loop and never read the touched
  // texels back, so they can opt out of building the return array.
  collect?: boolean
}

export type FillOptions = {
  opacity?: number
  blend?: BrushBlendMode
}

export type ShapeFillMode = "filled" | "hollow"

export interface ShapeOptions extends FillOptions {
  fill?: ShapeFillMode
  // Hollow outline width in texels (driven by brush size)
  thickness?: number
  clip?: Rect
}

export type BucketMode =
  | "face"
  | "element"
  | "selectedElements"
  | "connectedColors"
  | "colors"

export type LimbKey =
  | "head"
  | "body"
  | "rightArm"
  | "leftArm"
  | "rightLeg"
  | "leftLeg"

// Outer-layer cuboid name -> the limb whose armor toggle gates it
const OUTER_LIMB: Record<string, LimbKey> = {
  hat: "head",
  jacket: "body",
  rightSleeve: "rightArm",
  leftSleeve: "leftArm",
  rightPant: "rightLeg",
  leftPant: "leftLeg",
}

interface BrushPixelOffset {
  dx: number
  dy: number
  // 0 at brush center, ~1 at the edge; used for softness falloff
  dist: number
}

export function hexToRgba(hex: string, alpha = 255): RgbaColor {
  let clean = hex.trim().replace(/^#/, "")
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("")
  }
  if (clean.length === 8) {
    const r = parseInt(clean.slice(0, 2), 16)
    const g = parseInt(clean.slice(2, 4), 16)
    const b = parseInt(clean.slice(4, 6), 16)
    const a = parseInt(clean.slice(6, 8), 16)
    return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b, isNaN(a) ? 255 : a]
  }
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b, alpha]
}

export function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)))
    return clamped.toString(16).padStart(2, "0")
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function setPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  color: RgbaColor,
  size = 64,
): void {
  if (x < 0 || x >= size || y < 0 || y >= size) return
  const idx = (y * size + x) * 4
  data[idx] = color[0]
  data[idx + 1] = color[1]
  data[idx + 2] = color[2]
  data[idx + 3] = color[3]
}

export function getPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  size = 64,
): RgbaColor {
  if (x < 0 || x >= size || y < 0 || y >= size) return [0, 0, 0, 0]
  const idx = (y * size + x) * 4
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]]
}

// Offsets only depend on brush size and shape, and a single stroke applies the
// same brush to every interpolated texel. Cache per (shape, size) so a drag of
// dozens of stamps stops re-deriving the same lattice every time.
const brushOffsetCache = new Map<string, BrushPixelOffset[]>()

function getBrushOffsets(size: number, shape: BrushShape = "square"): BrushPixelOffset[] {
  const key = `${shape}:${size}`
  const cached = brushOffsetCache.get(key)
  if (cached) return cached

  if (size <= 1) {
    const single: BrushPixelOffset[] = [{ dx: 0, dy: 0, dist: 0 }]
    brushOffsetCache.set(key, single)
    return single
  }

  // n-wide box anchored so the clicked texel (0,0) is always covered:
  // size 1 -> {0}, 2 -> {0,1}, 3 -> {-1,0,1}, 4 -> {-1,0,1,2}, 5 -> {-2..2}
  const min = -Math.floor((size - 1) / 2)
  const max = Math.floor(size / 2)
  const c = (min + max) / 2
  // (max - min) / 2: box half-span; edges normalize to dist 1
  const halfSpan = (max - min) / 2

  const offsets: BrushPixelOffset[] = []
  for (let dy = min; dy <= max; dy++) {
    for (let dx = min; dx <= max; dx++) {
      if (shape === "circle") {
        const rEff = halfSpan + 0.25
        const ddx = dx - c
        const ddy = dy - c
        if (ddx * ddx + ddy * ddy > rEff * rEff + 0.01) continue
        offsets.push({ dx, dy, dist: Math.sqrt(ddx * ddx + ddy * ddy) / rEff })
      } else {
        const dist = Math.max(Math.abs(dx - c), Math.abs(dy - c)) / halfSpan
        offsets.push({ dx, dy, dist })
      }
    }
  }
  brushOffsetCache.set(key, offsets)
  return offsets
}

function blendChannels(
  blend: BrushBlendMode,
  dst: RgbaColor,
  src: RgbaColor,
): [number, number, number] {
  const d = [dst[0], dst[1], dst[2]]
  const s = [src[0], src[1], src[2]]
  const mix = (a: number) => Math.max(0, Math.min(255, Math.round(a)))
  switch (blend) {
    case "multiply":
      return [mix((d[0] * s[0]) / 255), mix((d[1] * s[1]) / 255), mix((d[2] * s[2]) / 255)]
    case "screen":
      return [
        mix(255 - ((255 - d[0]) * (255 - s[0])) / 255),
        mix(255 - ((255 - d[1]) * (255 - s[1])) / 255),
        mix(255 - ((255 - d[2]) * (255 - s[2])) / 255),
      ]
    case "lighten":
      return [mix(Math.max(d[0], s[0])), mix(Math.max(d[1], s[1])), mix(Math.max(d[2], s[2]))]
    case "darken":
      return [mix(Math.min(d[0], s[0])), mix(Math.min(d[1], s[1])), mix(Math.min(d[2], s[2]))]
    case "overlay":
      return [
        mix(d[0] < 128 ? (2 * d[0] * s[0]) / 255 : 255 - (2 * (255 - d[0]) * (255 - s[0])) / 255),
        mix(d[1] < 128 ? (2 * d[1] * s[1]) / 255 : 255 - (2 * (255 - d[1]) * (255 - s[1])) / 255),
        mix(d[2] < 128 ? (2 * d[2] * s[2]) / 255 : 255 - (2 * (255 - d[2]) * (255 - s[2])) / 255),
      ]
    default:
      return [s[0], s[1], s[2]]
  }
}

// Standard source-over compositing of a partially covered stroke onto dst
function compositeOver(dst: RgbaColor, src: [number, number, number], sa: number): RgbaColor {
  const dstA = dst[3] / 255
  const outA = sa + dstA * (1 - sa)
  if (outA <= 0.002) return [0, 0, 0, 0]
  const ch = (s: number, d: number) => Math.round((s * sa + d * dstA * (1 - sa)) / outA)
  return [ch(src[0], dst[0]), ch(src[1], dst[1]), ch(src[2], dst[2]), Math.round(outA * 255)]
}

function strokeCoverage(opacity: number, softness: number, dist: number): number {
  return Math.max(0, Math.min(1, opacity * (1 - softness * Math.min(1, dist))))
}

// Face clipping: stamps never bleed across cuboid face seams in the UV atlas
function isClipped(x: number, y: number, clip?: Rect): boolean {
  if (!clip) return false
  return x < clip.x || x >= clip.x + clip.w || y < clip.y || y >= clip.y + clip.h
}

export function applyBrush(
  data: Uint8ClampedArray,
  center: Point,
  size: number,
  color: RgbaColor,
  atlasSize = 64,
  options: BrushOptions = {},
): Point[] {
  const { shape = "square", opacity = 1, softness = 0, blend = "normal", clip } = options
  const offsets = getBrushOffsets(size, shape)
  const modified: Point[] | null = options.collect === false ? null : []
  for (const { dx, dy, dist } of offsets) {
    const x = center.x + dx
    const y = center.y + dy
    if (x >= 0 && x < atlasSize && y >= 0 && y < atlasSize && !isClipped(x, y, clip)) {
      const sa = strokeCoverage(opacity, softness, dist)
      if (sa <= 0) continue
      const dst = getPixel(data, x, y, atlasSize)
      // Blend modes need an existing color; over transparent pixels paint straight
      const blended: [number, number, number] =
        dst[3] < 8 || blend === "normal"
          ? [color[0], color[1], color[2]]
          : blendChannels(blend, dst, color)
      setPixel(data, x, y, compositeOver(dst, blended, sa), atlasSize)
      modified?.push({ x, y })
    }
  }
  return modified ?? []
}

export function applyEraser(
  data: Uint8ClampedArray,
  center: Point,
  size: number,
  atlasSize = 64,
  options: BrushOptions = {},
): Point[] {
  const { shape = "square", opacity = 1, softness = 0, clip } = options
  const offsets = getBrushOffsets(size, shape)
  const modified: Point[] | null = options.collect === false ? null : []
  for (const { dx, dy, dist } of offsets) {
    const x = center.x + dx
    const y = center.y + dy
    if (x >= 0 && x < atlasSize && y >= 0 && y < atlasSize && !isClipped(x, y, clip)) {
      const sa = strokeCoverage(opacity, softness, dist)
      if (sa <= 0) continue
      const current = getPixel(data, x, y, atlasSize)
      const outA = Math.round(current[3] * (1 - sa))
      if (outA <= 0) {
        setPixel(data, x, y, [0, 0, 0, 0], atlasSize)
      } else {
        setPixel(data, x, y, [current[0], current[1], current[2], outA], atlasSize)
      }
      modified?.push({ x, y })
    }
  }
  return modified ?? []
}

export function applyShading(
  data: Uint8ClampedArray,
  center: Point,
  size: number,
  mode: "lighten" | "darken",
  delta = 0.06,
  atlasSize = 64,
  options: BrushOptions = {},
): Point[] {
  const { shape = "square", opacity = 1, clip } = options
  const offsets = getBrushOffsets(size, shape)
  const modified: Point[] | null = options.collect === false ? null : []
  const step =
    Math.round(255 * delta * Math.max(0, Math.min(1, opacity))) *
    (mode === "lighten" ? 1 : -1)

  for (const { dx, dy } of offsets) {
    const x = center.x + dx
    const y = center.y + dy
    if (x >= 0 && x < atlasSize && y >= 0 && y < atlasSize && !isClipped(x, y, clip)) {
      const current = getPixel(data, x, y, atlasSize)
      // Do not shade transparent pixels
      if (current[3] < 8) continue
      const r = Math.max(0, Math.min(255, current[0] + step))
      const g = Math.max(0, Math.min(255, current[1] + step))
      const b = Math.max(0, Math.min(255, current[2] + step))
      setPixel(data, x, y, [r, g, b, current[3]], atlasSize)
      modified?.push({ x, y })
    }
  }
  return modified ?? []
}

export function applyColorJitter(baseHex: string, strength = 0.06): string {
  const [r, g, b] = hexToRgba(baseHex)
  const jitter = () => {
    const delta = (Math.random() * 2 - 1) * strength * 255
    return Math.max(0, Math.min(255, Math.round(r + delta)))
  }
  const deltaG = (Math.random() * 2 - 1) * strength * 255
  const deltaB = (Math.random() * 2 - 1) * strength * 255
  const newR = jitter()
  const newG = Math.max(0, Math.min(255, Math.round(g + deltaG)))
  const newB = Math.max(0, Math.min(255, Math.round(b + deltaB)))
  return rgbaToHex(newR, newG, newB)
}

function colorsMatch(c1: RgbaColor, c2: RgbaColor, tolerance = 16): boolean {
  if (c1[3] === 0 && c2[3] === 0) return true
  return (
    Math.abs(c1[0] - c2[0]) <= tolerance &&
    Math.abs(c1[1] - c2[1]) <= tolerance &&
    Math.abs(c1[2] - c2[2]) <= tolerance &&
    Math.abs(c1[3] - c2[3]) <= tolerance
  )
}

// Fills skip the early-exit only when the result would actually differ
function fillIsPlain(
  target: RgbaColor,
  fillColor: RgbaColor,
  options: FillOptions,
): boolean {
  const { opacity = 1, blend = "normal" } = options
  return opacity === 1 && blend === "normal" && colorsMatch(target, fillColor, 0)
}

function fillPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  fillColor: RgbaColor,
  atlasSize: number,
  options: FillOptions,
): void {
  const sa = Math.max(0, Math.min(1, options.opacity ?? 1))
  if (sa <= 0) return
  const dst = getPixel(data, x, y, atlasSize)
  // Blend modes need an existing color; over transparent pixels paint straight
  const blended: [number, number, number] =
    dst[3] < 8 || options.blend === undefined || options.blend === "normal"
      ? [fillColor[0], fillColor[1], fillColor[2]]
      : blendChannels(options.blend, dst, fillColor)
  setPixel(data, x, y, compositeOver(dst, blended, sa), atlasSize)
}

function fillRect(
  data: Uint8ClampedArray,
  rect: Rect,
  fillColor: RgbaColor,
  atlasSize: number,
  options: FillOptions,
): void {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      fillPixel(data, x, y, fillColor, atlasSize, options)
    }
  }
}

export function floodFill(
  data: Uint8ClampedArray,
  start: Point,
  fillColor: RgbaColor,
  atlasSize = 64,
  options: FillOptions = {},
  regionSource: Uint8ClampedArray = data,
): Point[] {
  if (start.x < 0 || start.x >= atlasSize || start.y < 0 || start.y >= atlasSize) {
    return []
  }
  const targetColor = getPixel(regionSource, start.x, start.y, atlasSize)
  if (fillIsPlain(targetColor, fillColor, options)) return []

  const queue: Point[] = [start]
  const visited = new Uint8Array(atlasSize * atlasSize)
  const modified: Point[] = []

  const startIndex = start.y * atlasSize + start.x
  visited[startIndex] = 1

  while (queue.length > 0) {
    const { x, y } = queue.pop()!
    fillPixel(data, x, y, fillColor, atlasSize, options)
    modified.push({ x, y })

    const neighbors: Point[] = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ]

    for (const neighbor of neighbors) {
      const { x: nx, y: ny } = neighbor
      if (nx >= 0 && nx < atlasSize && ny >= 0 && ny < atlasSize) {
        const nIdx = ny * atlasSize + nx
        if (!visited[nIdx]) {
          visited[nIdx] = 1
          const neighborColor = getPixel(regionSource, nx, ny, atlasSize)
          if (colorsMatch(neighborColor, targetColor)) {
            queue.push(neighbor)
          }
        }
      }
    }
  }

  return modified
}

export function faceFill(
  data: Uint8ClampedArray,
  start: Point,
  fillColor: RgbaColor,
  slim = false,
  atlasSize = 64,
  options: FillOptions = {},
): Point[] {
  const hit = findCuboidFaceAtTexel(start, slim)
  if (!hit) {
    // If not on any named face, fall back to flood fill
    return floodFill(data, start, fillColor, atlasSize, options)
  }

  fillRect(data, hit.rect, fillColor, atlasSize, options)
  return rectPoints(hit.rect)
}

function rectPoints(rect: Rect): Point[] {
  const points: Point[] = []
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      points.push({ x, y })
    }
  }
  return points
}

export function elementFill(
  data: Uint8ClampedArray,
  start: Point,
  fillColor: RgbaColor,
  slim = false,
  atlasSize = 64,
  options: FillOptions = {},
): Point[] {
  const hit = findCuboidAtTexel(start, slim)
  if (!hit) {
    // If not on any named element, fall back to flood fill
    return floodFill(data, start, fillColor, atlasSize, options)
  }

  const modified: Point[] = []
  for (const face of CUBOID_FACES) {
    const rect = hit.cuboid[face]
    fillRect(data, rect, fillColor, atlasSize, options)
    modified.push(...rectPoints(rect))
  }
  return modified
}

export function selectedElementsFill(
  data: Uint8ClampedArray,
  fillColor: RgbaColor,
  slim = false,
  atlasSize = 64,
  enabled: { body: Record<LimbKey, boolean>; armor: Record<LimbKey, boolean> },
  options: FillOptions = {},
): Point[] {
  const list = slim ? CUBOIDS_SLIM : CUBOIDS_CLASSIC
  const modified: Point[] = []
  for (const [cuboidName, cuboid] of list) {
    const isOuter = cuboidName in OUTER_LIMB
    const limb = isOuter ? OUTER_LIMB[cuboidName] : (cuboidName as LimbKey)
    const gates = isOuter ? enabled.armor : enabled.body
    if (!gates[limb]) continue
    for (const face of CUBOID_FACES) {
      const rect = cuboid[face]
      fillRect(data, rect, fillColor, atlasSize, options)
      modified.push(...rectPoints(rect))
    }
  }
  return modified
}

export function colorsFill(
  data: Uint8ClampedArray,
  start: Point,
  fillColor: RgbaColor,
  atlasSize = 64,
  options: FillOptions = {},
  regionSource: Uint8ClampedArray = data,
): Point[] {
  if (start.x < 0 || start.x >= atlasSize || start.y < 0 || start.y >= atlasSize) {
    return []
  }
  const targetColor = getPixel(regionSource, start.x, start.y, atlasSize)
  if (fillIsPlain(targetColor, fillColor, options)) return []

  const modified: Point[] = []
  for (let y = 0; y < atlasSize; y++) {
    for (let x = 0; x < atlasSize; x++) {
      if (colorsMatch(getPixel(regionSource, x, y, atlasSize), targetColor)) {
        fillPixel(data, x, y, fillColor, atlasSize, options)
        modified.push({ x, y })
      }
    }
  }
  return modified
}

function normalizeShapeBox(start: Point, end: Point) {
  return {
    x0: Math.min(start.x, end.x),
    y0: Math.min(start.y, end.y),
    x1: Math.max(start.x, end.x),
    y1: Math.max(start.y, end.y),
  }
}

function collectShape(
  data: Uint8ClampedArray,
  box: { x0: number; y0: number; x1: number; y1: number },
  contains: (x: number, y: number) => boolean,
  fillColor: RgbaColor,
  atlasSize: number,
  options: ShapeOptions,
): Point[] {
  const modified: Point[] = []
  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (x < 0 || x >= atlasSize || y < 0 || y >= atlasSize) continue
      if (isClipped(x, y, options.clip)) continue
      if (!contains(x, y)) continue
      fillPixel(data, x, y, fillColor, atlasSize, options)
      modified.push({ x, y })
    }
  }
  return modified
}

export function drawRectangle(
  data: Uint8ClampedArray,
  start: Point,
  end: Point,
  fillColor: RgbaColor,
  atlasSize = 64,
  options: ShapeOptions = {},
): Point[] {
  const { fill = "filled", thickness = 1 } = options
  const box = normalizeShapeBox(start, end)
  const t = Math.max(1, Math.round(thickness))

  const contains = (x: number, y: number) => {
    if (fill === "filled") return true
    // Ring membership: within `t` texels of any edge. Boxes narrower than 2t
    // collapse to a solid fill on their own.
    return (
      x <= box.x0 + t - 1 ||
      x >= box.x1 - t + 1 ||
      y <= box.y0 + t - 1 ||
      y >= box.y1 - t + 1
    )
  }
  return collectShape(data, box, contains, fillColor, atlasSize, options)
}

export function drawEllipse(
  data: Uint8ClampedArray,
  start: Point,
  end: Point,
  fillColor: RgbaColor,
  atlasSize = 64,
  options: ShapeOptions = {},
): Point[] {
  const { fill = "filled", thickness = 1 } = options
  const box = normalizeShapeBox(start, end)
  const w = box.x1 - box.x0 + 1
  const h = box.y1 - box.y0 + 1
  const cx = (box.x0 + box.x1 + 1) / 2
  const cy = (box.y0 + box.y1 + 1) / 2
  const rx = w / 2
  const ry = h / 2
  const t = Math.max(1, Math.round(thickness))
  const rxIn = rx - t
  const ryIn = ry - t

  const inOuter = (dx: number, dy: number) => (dx / rx) ** 2 + (dy / ry) ** 2 <= 1
  const contains = (x: number, y: number) => {
    const dx = x + 0.5 - cx
    const dy = y + 0.5 - cy
    if (!inOuter(dx, dy)) return false
    if (fill === "filled") return true
    // Hollow: inside the ellipse inset by `thickness`. Degenerate inner radii
    // leave no interior, so the whole ellipse fills solid.
    if (rxIn <= 0 || ryIn <= 0) return true
    return (dx / rxIn) ** 2 + (dy / ryIn) ** 2 > 1
  }
  return collectShape(data, box, contains, fillColor, atlasSize, options)
}

