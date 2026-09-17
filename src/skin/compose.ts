import type { Group, Piece } from "../data/catalog"
import { GROUPS } from "../data/catalog"
import { DEFAULT_BODY_ID, bodyOrDefault } from "../data/bodies"
import { shiftImageData } from "./hue"
import {
  CUBOID_FACES,
  HEAD,
  innerOuterPairs,
  type Cuboid,
} from "./uv"
import { makeSkinCanvas } from "./paint"
import { ensureModel, type SkinModel } from "./convert"
import { runOnceInflight } from "./inflight"

/** Groups a full-figure render must cover, derived from the catalog GROUPS. */
export const FULL_GROUPS: Group[] = [...GROUPS]

const ATLAS = 64
const decoded = new Map<string, HTMLImageElement>()
const decoding = new Map<string, Promise<HTMLImageElement>>()

/**
 * Cache of fully composed skin canvases, keyed by outfit + body + hue + model.
 * Switching clothing in the studio then resolves instantly (a Map hit) instead
 * of re-rasterizing and re-blitting every layer from scratch.
 */
const composedSkins = new Map<string, HTMLCanvasElement>()
const COMPOSED_CACHE_MAX = 48

function composedKey(
  outfit: Piece[],
  bodyId: string,
  bodyHue: number,
  model: SkinModel,
) {
  return `${bodyId}\u0000${bodyHue}\u0000${model}\u0000${outfit
    .map((piece) => piece.id)
    .join("\u0000")}`
}

function loadSkinImage(src: string) {
  return runOnceInflight<HTMLImageElement>(
    decoded,
    decoding,
    src,
    () =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.decoding = "async"
        if (/^https?:/i.test(src)) img.crossOrigin = "anonymous"
        img.onload = () => {
          decoded.set(src, img)
          resolve(img)
        }
        img.onerror = () => reject(new Error(`Could not load skin ${src}`))
        img.src = src
      }),
  )
}

function blitOpaque(
  dest: CanvasRenderingContext2D,
  source: CanvasImageSource,
) {
  const stamp = document.createElement("canvas")
  stamp.width = 64
  stamp.height = 64
  const stampCtx = stamp.getContext("2d")
  if (!stampCtx) throw new Error("2d canvas unavailable")
  stampCtx.imageSmoothingEnabled = false
  stampCtx.drawImage(source, 0, 0, 64, 64)
  const pixels = stampCtx.getImageData(0, 0, 64, 64)
  const out = dest.getImageData(0, 0, 64, 64)
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] < 8) continue
    out.data[i] = pixels.data[i]
    out.data[i + 1] = pixels.data[i + 1]
    out.data[i + 2] = pixels.data[i + 2]
    out.data[i + 3] = pixels.data[i + 3]
  }
  dest.putImageData(out, 0, 0)
}

function texel(x: number, y: number) {
  return (y * ATLAS + x) * 4
}

/**
 * Outer cuboids always render outside inner ones. If a higher piece paints the
 * inner layer, punch the matching outer texels already on the skin, then lift
 * that inner paint onto the outer so it sits in front of clothes below.
 *
 * Head is the exception: hat overlay is a visor/ears shell. Copying inner head
 * onto it fills holes and reads as a solid second cube.
 */
export function punchAndLiftOuter(
  dest: Uint8ClampedArray,
  piece: Uint8ClampedArray,
  slim: boolean,
) {
  for (const [inner, outer] of innerOuterPairs(slim)) {
    const lift = inner !== HEAD
    for (const face of CUBOID_FACES) {
      const a = inner[face]
      const b = outer[face]
      const w = Math.min(a.w, b.w)
      const h = Math.min(a.h, b.h)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const pi = texel(a.x + x, a.y + y)
          if (piece[pi + 3] < 8) continue
          const po = texel(b.x + x, b.y + y)
          if (dest[po + 3] < 8) continue
          dest[po + 3] = 0
          if (!lift || piece[po + 3] >= 8) continue
          dest[po] = piece[pi]
          dest[po + 1] = piece[pi + 1]
          dest[po + 2] = piece[pi + 2]
          dest[po + 3] = piece[pi + 3]
        }
      }
    }
  }
}

function blitPixels(dest: Uint8ClampedArray, source: Uint8ClampedArray) {
  for (let i = 0; i < source.length; i += 4) {
    if (source[i + 3] < 8) continue
    dest[i] = source[i]
    dest[i + 1] = source[i + 1]
    dest[i + 2] = source[i + 2]
    dest[i + 3] = source[i + 3]
  }
}

export function shiftFaceRegion(
  pixels: Uint8ClampedArray,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  offsetY: number,
) {
  if (offsetY === 0) return
  const copy: { x: number; y: number; r: number; g: number; b: number; a: number }[] = []
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * ATLAS + x) * 4
      const a = pixels[idx + 3]
      if (a > 0) {
        copy.push({
          x,
          y,
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2],
          a,
        })
      }
      pixels[idx] = 0
      pixels[idx + 1] = 0
      pixels[idx + 2] = 0
      pixels[idx + 3] = 0
    }
  }
  for (const p of copy) {
    const targetY = p.y + offsetY
    if (targetY >= minY && targetY <= maxY) {
      const idx = (targetY * ATLAS + p.x) * 4
      pixels[idx] = p.r
      pixels[idx + 1] = p.g
      pixels[idx + 2] = p.b
      pixels[idx + 3] = p.a
    }
  }
}

export function shiftEyeImageData(pixels: Uint8ClampedArray, offsetY: number) {
  if (offsetY === 0) return
  shiftFaceRegion(pixels, 8, 15, 8, 15, offsetY)
  shiftFaceRegion(pixels, 40, 47, 8, 15, offsetY)
}

/** Blit a piece's raw skin onto a fresh 64x64 canvas, eye offset applied. */
async function rasterPieceBase(piece: Piece): Promise<HTMLCanvasElement> {
  const { canvas, ctx } = makeSkinCanvas()
  blitOpaque(ctx, await loadSkinImage(piece.skin))
  if (piece.offsetY && piece.slot === "eyes") {
    const imgData = ctx.getImageData(0, 0, ATLAS, ATLAS)
    shiftEyeImageData(imgData.data, piece.offsetY)
    ctx.putImageData(imgData, 0, 0)
  }
  return canvas
}

async function rasterPiece(piece: Piece, model: SkinModel) {
  const normalized = ensureModel(await rasterPieceBase(piece), model)
  const normCtx = normalized.getContext("2d")
  if (!normCtx) throw new Error("2d canvas unavailable")
  return normCtx.getImageData(0, 0, ATLAS, ATLAS)
}

export async function composeSkin(
  outfit: Piece[],
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model: SkinModel = "classic",
) {
  const slim = model === "slim"
  const key = composedKey(outfit, bodyId, bodyHue, model)
  const cached = composedSkins.get(key)
  if (cached) {
    // Refresh LRU order so the hottest looks survive the cap.
    composedSkins.delete(key)
    composedSkins.set(key, cached)
    return cached
  }
  const { canvas: base, ctx } = makeSkinCanvas()
  blitOpaque(ctx, await loadSkinImage(bodyOrDefault(bodyId).skin))
  const normalizedBody = ensureModel(base, model)
  const bodyCtx = normalizedBody.getContext("2d")
  if (!bodyCtx) throw new Error("2d canvas unavailable")
  const dest = shiftImageData(bodyCtx.getImageData(0, 0, ATLAS, ATLAS), bodyHue)
  for (const piece of outfit) {
    const layer = await rasterPiece(piece, model)
    punchAndLiftOuter(dest.data, layer.data, slim)
    blitPixels(dest.data, layer.data)
  }
  ctx.putImageData(dest, 0, 0)
  composedSkins.set(key, base)
  if (composedSkins.size > COMPOSED_CACHE_MAX) {
    const oldest = composedSkins.keys().next().value
    if (oldest !== undefined) composedSkins.delete(oldest)
  }
  return base
}

export type DownloadSkinOptions = {
  filename?: string
}

export async function downloadSkinFile(
  outfit: Piece[],
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model: SkinModel = "classic",
  options: DownloadSkinOptions | string = "looms-look",
) {
  const canvas = await composeSkin(outfit, bodyId, bodyHue, model)
  const rawFilename = typeof options === "string" ? options : options?.filename
  const stem = rawFilename?.trim() || "looms-look"
  const a = document.createElement("a")
  // composeSkin may hand back a cached canvas shared with live viewers; export
  // from a private copy so nothing else can ever see later mutations.
  const snapshot = document.createElement("canvas")
  snapshot.width = canvas.width
  snapshot.height = canvas.height
  snapshot.getContext("2d")?.drawImage(canvas, 0, 0)
  a.href = snapshot.toDataURL("image/png")
  a.download = stem.toLowerCase().endsWith(".png") ? stem : `${stem}.png`
  a.click()
}

export async function tryDownloadSkinFile(
  outfit: Piece[],
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model: SkinModel = "classic",
  options: DownloadSkinOptions | string = "looms-look",
) {
  try {
    await downloadSkinFile(outfit, bodyId, bodyHue, model, options)
    return true
  } catch {
    return false
  }
}

export async function composePieceSkin(piece: Piece) {
  return rasterPieceBase(piece)
}

function atlasOpaque(data: Uint8ClampedArray, x: number, y: number) {
  return data[(y * ATLAS + x) * 4 + 3] > 8
}

function atlasRegionPainted(
  data: Uint8ClampedArray,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (atlasOpaque(data, x, y)) return true
    }
  }
  return false
}

export const SKIN_PARTS = [
  "head",
  "body",
  "rightArm",
  "leftArm",
  "rightLeg",
  "leftLeg",
] as const
export type SkinPart = (typeof SKIN_PARTS)[number]

/** Atlas bounds of each rendered mesh, inner and outer layers included. */
const PART_REGIONS: Record<SkinPart, [number, number, number, number]> = {
  head: [0, 0, 64, 16],
  body: [16, 16, 40, 48],
  rightArm: [40, 16, 56, 48],
  leftArm: [32, 48, 64, 64],
  rightLeg: [0, 16, 16, 48],
  leftLeg: [0, 48, 32, 64],
}

/**
 * Which rendered meshes have paint. Finer than {@link groupsFromAtlas}: a shirt
 * that only paints the body should not drag the bare arms into frame.
 */
export function partsFromAtlas(canvas: HTMLCanvasElement): SkinPart[] {
  const ctx = canvas.getContext("2d")
  if (!ctx) return []
  const { data } = ctx.getImageData(0, 0, ATLAS, ATLAS)
  return SKIN_PARTS.filter((part) => {
    const [x0, y0, x1, y1] = PART_REGIONS[part]
    return atlasRegionPainted(data, x0, y0, x1, y1)
  })
}

/** Which body rack each rendered mesh paints. */
export const PART_GROUP: Record<SkinPart, Group> = {
  head: "head",
  body: "torso",
  rightArm: "torso",
  leftArm: "torso",
  rightLeg: "legs",
  leftLeg: "legs",
}

/** Which body racks have paint — long hair often lands on torso overlay, not just the head. */
export function groupsFromAtlas(canvas: HTMLCanvasElement): Group[] {
  const ctx = canvas.getContext("2d")
  if (!ctx) return ["head"]
  const { data } = ctx.getImageData(0, 0, ATLAS, ATLAS)
  const hit = new Set<Group>()
  for (const part of SKIN_PARTS) {
    const [x0, y0, x1, y1] = PART_REGIONS[part]
    if (atlasRegionPainted(data, x0, y0, x1, y1)) hit.add(PART_GROUP[part])
  }
  const groups = GROUPS.filter((group) => hit.has(group))
  return groups.length ? groups : ["head"]
}

function cuboidPainted(data: Uint8ClampedArray, cuboid: Cuboid): boolean {
  for (const face of CUBOID_FACES) {
    const f = cuboid[face]
    if (atlasRegionPainted(data, f.x, f.y, f.x + f.w, f.y + f.h)) return true
  }
  return false
}

/**
 * Which limbs' outer (second) skin layer regions hold paint, keyed like
 * LimbId. Editor sessions default each limb's second layer on only when the
 * texture actually paints it.
 */
export function outerPartsPainted(canvas: HTMLCanvasElement): Record<SkinPart, boolean> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) {
    return { head: false, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false }
  }
  const { data } = ctx.getImageData(0, 0, ATLAS, ATLAS)
  const pairs = innerOuterPairs(false)
  const slimPairs = innerOuterPairs(true)
  return {
    head: cuboidPainted(data, pairs[0][1]) || cuboidPainted(data, slimPairs[0][1]),
    body: cuboidPainted(data, pairs[1][1]) || cuboidPainted(data, slimPairs[1][1]),
    rightArm: cuboidPainted(data, pairs[2][1]) || cuboidPainted(data, slimPairs[2][1]),
    leftArm: cuboidPainted(data, pairs[3][1]) || cuboidPainted(data, slimPairs[3][1]),
    rightLeg: cuboidPainted(data, pairs[4][1]) || cuboidPainted(data, slimPairs[4][1]),
    leftLeg: cuboidPainted(data, pairs[5][1]) || cuboidPainted(data, slimPairs[5][1]),
  }
}

export function focusForGroups(groups: Group[]): Group | "full" {
  return groups.length === 1 ? groups[0] : "full"
}
