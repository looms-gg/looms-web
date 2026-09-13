import { MAX_LIMITS, validateFileSize } from "./sanitize"

export function validateDimensions(
  width: number,
  height: number,
): { valid: boolean; error?: string } {
  if (width !== 64 || height !== 64) {
    return {
      valid: false,
      error: "Texture must be 64x64 pixels (standard Minecraft skin format).",
    }
  }
  return { valid: true }
}

export type PngTextureValidation =
  | { ok: true; objectUrl: string; img: HTMLImageElement }
  | { ok: false; error: string }

/**
 * Validate a garment texture file end to end: PNG type, byte limit, and the
 * 64x64 dimension contract. On success the caller owns `objectUrl` (keep it
 * as a preview or revoke it); on failure the blob URL is revoked for you.
 */
export function validatePngTexture(file: File): Promise<PngTextureValidation> {
  return new Promise((resolve) => {
    if (file.type !== "image/png") {
      resolve({
        ok: false,
        error: "Only PNG files are supported for Minecraft garment textures.",
      })
      return
    }

    const sizeCheck = validateFileSize(file, MAX_LIMITS.FILE_SIZE_BYTES)
    if (!sizeCheck.valid) {
      resolve({ ok: false, error: sizeCheck.error ?? "File size too large." })
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const { valid, error } = validateDimensions(img.width, img.height)
      if (!valid) {
        URL.revokeObjectURL(objectUrl)
        resolve({ ok: false, error: error ?? "Invalid texture dimensions." })
        return
      }
      resolve({ ok: true, objectUrl, img })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ ok: false, error: "Could not load texture file." })
    }
    img.src = objectUrl
  })
}
