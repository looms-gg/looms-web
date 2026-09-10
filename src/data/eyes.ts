import type { Piece } from "./pieceTypes"

// Vite glob imports for bundled eye textures. Previews crop these atlases
// live (eyeThumbUrl) — there are no separate thumb assets to keep in sync.
const skinModules = import.meta.glob<{ default: string }>(
  "../assets/eyes/eye-*.png",
  { eager: true }
)

export type Eye = {
  id: string
  name: string
  skin: string
  thumb: string
  hasWhites: boolean
}

/** Base eye ids whose skin texture includes near-white sclera pixels. */
export const EYES_WITH_WHITES: ReadonlySet<string> = new Set([
  "eye-25",
  "eye-32",
  "eye-34",
  "eye-35",
  "eye-37",
  "eye-38",
  "eye-39",
  "eye-40",
  "eye-41",
  "eye-42",
  "eye-43",
  "eye-44",
  "eye-45",
  "eye-46",
  "eye-47",
  "eye-48",
  "eye-49",
  "eye-50",
  "eye-51",
  "eye-52",
  "eye-53",
  "eye-54",
  "eye-55",
  "eye-56",
  "eye-57",
  "eye-58",
  "eye-59",
  "eye-60",
  "eye-61",
  "eye-62",
  "eye-63",
  "eye-64",
  "eye-65",
  "eye-66",
  "eye-67",
  "eye-68",
  "eye-69",
  "eye-70",
  "eye-71",
])

function resolveAssetUrl(module: unknown): string {
  if (typeof module === "string") return module
  if (module && typeof module === "object" && "default" in module) {
    return (module as { default: string }).default
  }
  return ""
}

// Build list of eyes, whites-first then id ascending within each group.
// Previews always derive from the eye texture itself (the 64×64 atlas PNG):
// thumbs are cropped live in a shared offscreen canvas, so updating an eye
// PNG can never leave a stale second copy of the art in the UI.
const eyeThumbCache = new Map<string, string>()

export function eyeThumbUrl(eye: Eye): string {
  const hit = eyeThumbCache.get(eye.id)
  if (hit) return hit
  const canvas = document.createElement("canvas")
  canvas.width = 8
  canvas.height = 8
  const ctx = canvas.getContext("2d")
  if (!ctx) return eye.skin
  ctx.imageSmoothingEnabled = false
  const img = new Image()
  img.src = eye.skin
  // drawImage of a not-yet-loaded image is a no-op; fall back to the atlas
  // itself and retry once the decode completes.
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8)
  } else {
    img.onload = () => {
      const retry = document.createElement("canvas")
      retry.width = 8
      retry.height = 8
      const rctx = retry.getContext("2d")
      if (!rctx) return
      rctx.imageSmoothingEnabled = false
      rctx.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8)
      eyeThumbCache.set(eye.id, retry.toDataURL())
    }
    return eye.skin
  }
  const url = canvas.toDataURL()
  eyeThumbCache.set(eye.id, url)
  return url
}

export const bundledEyes: Eye[] = Object.keys(skinModules)
  .sort((a, b) => a.localeCompare(b))
  .map((skinPath, index) => {
    const num = index + 1
    const id = `eye-${String(num).padStart(2, "0")}`
    const skinUrl = resolveAssetUrl(skinModules[skinPath])
    return {
      id,
      name: `Eyes #${String(num).padStart(2, "0")}`,
      skin: skinUrl,
      thumb: "",
      hasWhites: EYES_WITH_WHITES.has(id),
    }
  })
  .sort((a, b) => {
    if (a.hasWhites !== b.hasWhites) return a.hasWhites ? -1 : 1
    return a.id.localeCompare(b.id)
  })

// Symmetric vertical range: -3 = three pixels up, +3 = three pixels down,
// 0 (the middle) = default position.
export const EYE_OFFSET_MIN = -3
export const EYE_OFFSET_MAX = 3

export function clampEyeOffset(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(EYE_OFFSET_MIN, Math.min(EYE_OFFSET_MAX, Math.round(value)))
}

export function parseEyeId(id: string): { baseId: string; offset: number } {
  const match = id.match(/^([a-zA-Z0-9_-]+?)(?:@(-?\d+))?$/)
  if (!match) return { baseId: id, offset: 0 }
  const rawOffset = match[2] !== undefined ? parseInt(match[2], 10) : 0
  return {
    baseId: match[1],
    offset: clampEyeOffset(rawOffset),
  }
}

export function formatEyeId(baseId: string, offset: number = 0): string {
  const clamped = clampEyeOffset(offset)
  return clamped === 0 ? baseId : `${baseId}@${clamped}`
}

const eyeById = new Map<string, Eye>(bundledEyes.map((eye) => [eye.id, eye]))

export function getEye(id: string): Eye | undefined {
  const { baseId } = parseEyeId(id)
  return eyeById.get(baseId)
}

export function eyeToPiece(eye: Eye, offset: number = 0): Piece {
  const clamped = clampEyeOffset(offset)
  const id = formatEyeId(eye.id, clamped)
  return {
    id,
    name: eye.name,
    slot: "eyes",
    group: "head",
    maker: "System",
    savedCount: 0,
    likeCount: 0,
    added: 0,
    blurb: "Bundled eye styling",
    skin: eye.skin,
    covers: ["head"],
    offsetY: clamped,
  }
}

export function getEyePiece(id: string, overrideOffset?: number): Piece | undefined {
  const { baseId, offset } = parseEyeId(id)
  const finalOffset = overrideOffset !== undefined ? overrideOffset : offset
  const eye = getEye(baseId)
  return eye ? eyeToPiece(eye, finalOffset) : undefined
}
