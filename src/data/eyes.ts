import type { Piece } from "./pieceTypes"

// Vite glob imports for bundled eye textures
const skinModules = import.meta.glob<{ default: string }>(
  "../assets/eyes/eye-*.png",
  { eager: true }
)
const thumbModules = import.meta.glob<{ default: string }>(
  "../assets/eyes/thumbs/eye-*.png",
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

// Build list of eyes, whites-first then id ascending within each group
export const bundledEyes: Eye[] = Object.keys(skinModules)
  .sort((a, b) => a.localeCompare(b))
  .map((skinPath, index) => {
    const num = index + 1
    const id = `eye-${String(num).padStart(2, "0")}`
    const thumbPath = skinPath.replace("/eyes/", "/eyes/thumbs/")
    const skinUrl = resolveAssetUrl(skinModules[skinPath])
    const thumbUrl = resolveAssetUrl(thumbModules[thumbPath])
    return {
      id,
      name: `Eyes #${String(num).padStart(2, "0")}`,
      skin: skinUrl,
      thumb: thumbUrl || skinUrl,
      hasWhites: EYES_WITH_WHITES.has(id),
    }
  })
  .sort((a, b) => {
    if (a.hasWhites !== b.hasWhites) return a.hasWhites ? -1 : 1
    return a.id.localeCompare(b.id)
  })

export const EYE_OFFSET_MIN = -3
export const EYE_OFFSET_MAX = 1

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
