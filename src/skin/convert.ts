export type SkinModel = "classic" | "slim"
export type ArmModelDetection = SkinModel | "universal"

const ATLAS = 64

type FaceMapping = {
  // Steve coords
  sx: number
  sy: number
  sw: number
  sh: number
  // Alex coords
  ax: number
  ay: number
  aw: number
  ah: number
}

// Full list of arm cuboid faces across both layers
const ARM_FACES: FaceMapping[] = [
  // Right Arm Layer 1
  { sx: 44, sy: 16, sw: 4, sh: 4, ax: 44, ay: 16, aw: 3, ah: 4 }, // top
  { sx: 48, sy: 16, sw: 4, sh: 4, ax: 47, ay: 16, aw: 3, ah: 4 }, // bottom
  { sx: 40, sy: 20, sw: 4, sh: 12, ax: 40, ay: 20, aw: 4, ah: 12 }, // outside (right)
  { sx: 44, sy: 20, sw: 4, sh: 12, ax: 44, ay: 20, aw: 3, ah: 12 }, // front
  { sx: 48, sy: 20, sw: 4, sh: 12, ax: 47, ay: 20, aw: 4, ah: 12 }, // inside (left)
  { sx: 52, sy: 20, sw: 4, sh: 12, ax: 51, ay: 20, aw: 3, ah: 12 }, // back

  // Right Arm Layer 2 (Sleeve)
  { sx: 44, sy: 32, sw: 4, sh: 4, ax: 44, ay: 32, aw: 3, ah: 4 }, // top
  { sx: 48, sy: 32, sw: 4, sh: 4, ax: 47, ay: 32, aw: 3, ah: 4 }, // bottom
  { sx: 40, sy: 36, sw: 4, sh: 12, ax: 40, ay: 36, aw: 4, ah: 12 }, // outside (right)
  { sx: 44, sy: 36, sw: 4, sh: 12, ax: 44, ay: 36, aw: 3, ah: 12 }, // front
  { sx: 48, sy: 36, sw: 4, sh: 12, ax: 47, ay: 36, aw: 4, ah: 12 }, // inside (left)
  { sx: 52, sy: 36, sw: 4, sh: 12, ax: 51, ay: 36, aw: 3, ah: 12 }, // back

  // Left Arm Layer 1
  { sx: 36, sy: 48, sw: 4, sh: 4, ax: 36, ay: 48, aw: 3, ah: 4 }, // top
  { sx: 40, sy: 48, sw: 4, sh: 4, ax: 39, ay: 48, aw: 3, ah: 4 }, // bottom
  { sx: 32, sy: 52, sw: 4, sh: 12, ax: 32, ay: 52, aw: 4, ah: 12 }, // inside (right)
  { sx: 36, sy: 52, sw: 4, sh: 12, ax: 36, ay: 52, aw: 3, ah: 12 }, // front
  { sx: 40, sy: 52, sw: 4, sh: 12, ax: 39, ay: 52, aw: 4, ah: 12 }, // outside (left)
  { sx: 44, sy: 52, sw: 4, sh: 12, ax: 43, ay: 52, aw: 3, ah: 12 }, // back

  // Left Arm Layer 2 (Sleeve)
  { sx: 52, sy: 48, sw: 4, sh: 4, ax: 52, ay: 48, aw: 3, ah: 4 }, // top
  { sx: 56, sy: 48, sw: 4, sh: 4, ax: 55, ay: 48, aw: 3, ah: 4 }, // bottom
  { sx: 48, sy: 52, sw: 4, sh: 12, ax: 48, ay: 52, aw: 4, ah: 12 }, // inside (right)
  { sx: 52, sy: 52, sw: 4, sh: 12, ax: 52, ay: 52, aw: 3, ah: 12 }, // front
  { sx: 56, sy: 52, sw: 4, sh: 12, ax: 55, ay: 52, aw: 4, ah: 12 }, // outside (left)
  { sx: 60, sy: 52, sw: 4, sh: 12, ax: 59, ay: 52, aw: 3, ah: 12 }, // back
]

// All rectangular regions covering arm texture space on the 64x64 canvas
const ARM_REGIONS: { x: number; y: number; w: number; h: number }[] = [
  { x: 40, y: 16, w: 16, h: 32 }, // right arm layer 1 & 2
  { x: 32, y: 48, w: 32, h: 16 }, // left arm layer 1 & 2
]

// Steve-exclusive UV sample columns: [x, y, h]
// In classic skins, these columns contain valid texture pixels.
// In slim skins, these columns are empty (alpha <= 8).
const STEVE_EXCLUSIVE_COLUMNS: [number, number, number][] = [
  [55, 20, 12], // Right arm layer 1 back face
  [55, 36, 12], // Right arm layer 2 back face
  [47, 52, 12], // Left arm layer 1 back face
  [63, 52, 12], // Left arm layer 2 back face
  [51, 16, 4], // Right arm layer 1 bottom face
  [51, 32, 4], // Right arm layer 2 bottom face
  [43, 48, 4], // Left arm layer 1 bottom face
  [59, 48, 4], // Left arm layer 2 bottom face
]

function getPixelIndex(x: number, y: number): number {
  return (y * ATLAS + x) * 4
}

function hasOpaquePixelInCol(
  data: Uint8ClampedArray,
  col: number,
  yStart: number,
  height: number,
): boolean {
  for (let y = yStart; y < yStart + height; y++) {
    if (data[getPixelIndex(col, y) + 3] > 8) {
      return true
    }
  }
  return false
}

function hasAnyArmPixels(data: Uint8ClampedArray): boolean {
  for (const region of ARM_REGIONS) {
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        if (data[getPixelIndex(x, y) + 3] > 8) {
          return true
        }
      }
    }
  }
  return false
}

/**
 * Detect whether a 64×64 skin's arms are formatted as Classic (4px), Slim (3px),
 * or Universal (contains no arm pixels at all, e.g. hats, pants, footwear).
 */
export function detectSkinModel(data: Uint8ClampedArray): ArmModelDetection {
  if (!hasAnyArmPixels(data)) {
    return "universal"
  }

  for (const [col, yStart, height] of STEVE_EXCLUSIVE_COLUMNS) {
    if (hasOpaquePixelInCol(data, col, yStart, height)) {
      return "classic"
    }
  }

  return "slim"
}

function clearArmRegions(dest: Uint8ClampedArray) {
  for (const region of ARM_REGIONS) {
    for (let y = region.y; y < region.y + region.h; y++) {
      for (let x = region.x; x < region.x + region.w; x++) {
        const i = getPixelIndex(x, y)
        dest[i] = 0
        dest[i + 1] = 0
        dest[i + 2] = 0
        dest[i + 3] = 0
      }
    }
  }
}

/**
 * Converts a 64×64 skin from Classic (Steve 4px) to Slim (Alex 3px) format.
 * Narrows 4px faces (Top, Bottom, Front, Back) to 3px by dropping the innermost column,
 * shifts adjacent faces into their Slim UV positions, and clears extra columns.
 */
export function classicToSlimImageData(src: ImageData): ImageData {
  const destData = new Uint8ClampedArray(src.data)
  clearArmRegions(destData)

  for (const face of ARM_FACES) {
    for (let y = 0; y < face.ah; y++) {
      for (let x = 0; x < face.aw; x++) {
        // Source column: map 3px destination directly from first 3 columns of 4px source
        const sx = face.sx + x
        const sy = face.sy + y
        const dx = face.ax + x
        const dy = face.ay + y

        const si = getPixelIndex(sx, sy)
        const di = getPixelIndex(dx, dy)

        destData[di] = src.data[si]
        destData[di + 1] = src.data[si + 1]
        destData[di + 2] = src.data[si + 2]
        destData[di + 3] = src.data[si + 3]
      }
    }
  }

  return new ImageData(destData, ATLAS, ATLAS)
}

/**
 * Converts a 64×64 skin from Slim (Alex 3px) to Classic (Steve 4px) format.
 * Expands 3px faces (Top, Bottom, Front, Back) to 4px by duplicating/stretching
 * the edge pixel into the 4th column.
 */
export function slimToClassicImageData(src: ImageData): ImageData {
  const destData = new Uint8ClampedArray(src.data)
  clearArmRegions(destData)

  for (const face of ARM_FACES) {
    for (let y = 0; y < face.sh; y++) {
      for (let x = 0; x < face.sw; x++) {
        // Source column: if face is 4px in Classic and 3px in Slim, clamp/stretch the 3rd pixel
        const clampedX = Math.min(x, face.aw - 1)
        const sx = face.ax + clampedX
        const sy = face.ay + y
        const dx = face.sx + x
        const dy = face.sy + y

        const si = getPixelIndex(sx, sy)
        const di = getPixelIndex(dx, dy)

        destData[di] = src.data[si]
        destData[di + 1] = src.data[si + 1]
        destData[di + 2] = src.data[si + 2]
        destData[di + 3] = src.data[si + 3]
      }
    }
  }

  return new ImageData(destData, ATLAS, ATLAS)
}

/**
 * Ensures that an image/canvas is formatted for the target model (Classic or Slim).
 * If the source is universal (no arm pixels) or already in targetModel format, returns source.
 * Otherwise, transforms and returns a new 64×64 canvas.
 */
export function ensureModel(
  source: HTMLCanvasElement,
  targetModel: SkinModel,
): HTMLCanvasElement {
  const ctx = source.getContext("2d")
  if (!ctx) return source

  const imgData = ctx.getImageData(0, 0, ATLAS, ATLAS)
  const currentModel = detectSkinModel(imgData.data)

  if (currentModel === "universal" || currentModel === targetModel) {
    return source
  }

  const converted =
    targetModel === "slim"
      ? classicToSlimImageData(imgData)
      : slimToClassicImageData(imgData)

  const out = document.createElement("canvas")
  out.width = ATLAS
  out.height = ATLAS
  const outCtx = out.getContext("2d")
  if (!outCtx) return source

  outCtx.imageSmoothingEnabled = false
  outCtx.putImageData(converted, 0, 0)
  return out
}
