export const AVATAR_MAX = 512
export const BANNER_MAX_W = 1500
export const BANNER_MAX_H = 500
export const AVATAR_TARGET_BYTES = 100 * 1024
export const BANNER_TARGET_BYTES = 200 * 1024

const QUALITY_FLOOR = 0.4
const QUALITY_STEP = 0.08

export type AvatarDraw = {
  sx: number
  sy: number
  sw: number
  sh: number
  dw: number
  dh: number
}

/** Normalized crop chosen in the settings crop modal. */
export type ProfileCrop = {
  cx: number
  cy: number
  zoom: number
}

const DEFAULT_CROP: ProfileCrop = { cx: 0.5, cy: 0.5, zoom: 1 }

/**
 * Convert the modal's normalized crop (center + zoom over the cover-fit base)
 * into canvas source coordinates. Mirrors ImageCropModal's preview math so the
 * user sees exactly what gets uploaded.
 */
export function fitCropDraw(
  srcW: number,
  srcH: number,
  aspect: number,
  crop: ProfileCrop = DEFAULT_CROP,
): AvatarDraw {
  // Base cover rect at zoom 1: largest rect of `aspect` that fits the source.
  let rectW = srcW
  let rectH = rectW / aspect
  if (rectH > srcH) {
    rectH = srcH
    rectW = rectH * aspect
  }
  const zoomedW = Math.min(srcW, rectW / crop.zoom)
  const zoomedH = Math.min(srcH, rectH / crop.zoom)
  const sw = Math.max(1, Math.round(zoomedW))
  const sh = Math.max(1, Math.round(zoomedH))
  const sx = Math.round(
    Math.min(Math.max(crop.cx * srcW - sw / 2, 0), srcW - sw),
  )
  const sy = Math.round(
    Math.min(Math.max(crop.cy * srcH - sh / 2, 0), srcH - sh),
  )
  return { sx, sy, sw, sh, dw: sw, dh: sh }
}

/** Center cover-crop to square, then scale down to at most AVATAR_MAX (never upscale). */
export function fitAvatarDraw(srcW: number, srcH: number): AvatarDraw {
  const side = Math.min(srcW, srcH)
  const sx = Math.floor((srcW - side) / 2)
  const sy = Math.floor((srcH - side) / 2)
  const out = Math.min(AVATAR_MAX, side)
  return { sx, sy, sw: side, sh: side, dw: out, dh: out }
}

/** Scale to fit within banner box; never upscale. */
export function fitBannerSize(srcW: number, srcH: number): { dw: number; dh: number } {
  const scale = Math.min(1, BANNER_MAX_W / srcW, BANNER_MAX_H / srcH)
  return {
    dw: Math.max(1, Math.round(srcW * scale)),
    dh: Math.max(1, Math.round(srcH * scale)),
  }
}

function blobToFile(blob: Blob, kind: "avatar" | "banner", mime: string): File {
  const ext = mime === "image/webp" ? "webp" : "jpg"
  return new File([blob], `${kind}.${ext}`, { type: mime })
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality)
  })
}

function supportsWebp(canvas: HTMLCanvasElement): boolean {
  try {
    return canvas.toDataURL("image/webp").startsWith("data:image/webp")
  } catch {
    return false
  }
}

function pickMime(canvas: HTMLCanvasElement): "image/webp" | "image/jpeg" {
  return supportsWebp(canvas) ? "image/webp" : "image/jpeg"
}

async function decodeBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      /* fall through to HTMLImageElement */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Couldn't decode image."))
      el.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function sourceSize(source: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  if ("naturalWidth" in source && source.naturalWidth > 0) {
    return { w: source.naturalWidth, h: source.naturalHeight }
  }
  return { w: source.width, h: source.height }
}

/**
 * Resize + re-encode a profile avatar or banner for storage.
 * Prefers WebP; falls back to JPEG. Loops quality down toward targets.
 */
export async function compressProfileImage(
  file: File,
  kind: "avatar" | "banner",
  crop?: ProfileCrop,
): Promise<File> {
  const source = await decodeBitmap(file)
  const { w, h } = sourceSize(source)
  if (w < 1 || h < 1) {
    throw new Error("Couldn't decode image.")
  }

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d canvas unavailable")

  if (crop) {
    // Explicit crop from the settings modal wins over the auto center-crop.
    const aspect = kind === "avatar" ? 1 : BANNER_MAX_W / BANNER_MAX_H
    const draw = fitCropDraw(w, h, aspect, crop)
    canvas.width = draw.dw
    canvas.height = draw.dh
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(source, draw.sx, draw.sy, draw.sw, draw.sh, 0, 0, draw.dw, draw.dh)
  } else if (kind === "avatar") {
    const draw = fitAvatarDraw(w, h)
    canvas.width = draw.dw
    canvas.height = draw.dh
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(source, draw.sx, draw.sy, draw.sw, draw.sh, 0, 0, draw.dw, draw.dh)
  } else {
    const size = fitBannerSize(w, h)
    canvas.width = size.dw
    canvas.height = size.dh
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(source, 0, 0, w, h, 0, 0, size.dw, size.dh)
  }

  if ("close" in source && typeof source.close === "function") {
    source.close()
  }

  const mime = pickMime(canvas)
  const target = kind === "avatar" ? AVATAR_TARGET_BYTES : BANNER_TARGET_BYTES
  let quality = kind === "avatar" ? 0.72 : 0.7
  let best: Blob | null = null

  while (quality >= QUALITY_FLOOR - 1e-9) {
    const blob = await encodeCanvas(canvas, mime, quality)
    if (!blob || blob.size === 0) break
    best = blob
    if (blob.size <= target) break
    quality -= QUALITY_STEP
  }

  if (!best) {
    throw new Error("Couldn't compress image.")
  }

  return blobToFile(best, kind, mime === "image/webp" ? "image/webp" : "image/jpeg")
}
