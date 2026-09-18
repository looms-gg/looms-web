import { withBase } from "../../lib/basePath"
import manifest from "../../data/isoStaticThumbs.json"
import type { Piece } from "../../data/pieceTypes"
import { washFromCanvas } from "../../skin/wash"

const baked = new Set((manifest as { baked: string[] }).baked)

export function staticIsoThumbUrl(
  piece: Pick<Piece, "id" | "thumb">,
  baseUrl = import.meta.env.BASE_URL,
): string | null {
  if (piece.thumb) return piece.thumb
  return baked.has(piece.id) ? withBase(`/iso/pieces/${piece.id}.png`, baseUrl) : null
}

/** One decode per piece per device: the wash is cached alongside the PNG. */
export async function staticIsoWash(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return null
      ctx.drawImage(bitmap, 0, 0)
      return washFromCanvas(canvas)
    } finally {
      bitmap.close()
    }
  } catch {
    return null
  }
}
