import type { SupabaseFacade } from "../supabase"
import type { Piece } from "../../data/pieceTypes"

/**
 * Bake a look thumbnail with the real render engine and upload it next to the
 * owner's garment textures. Best-effort by contract: any failure returns null
 * and the caller's save proceeds unchanged — a missing thumb just falls back
 * to the shared outfit image in embeds.
 */
export async function bakeAndUploadLookThumb(
  client: SupabaseFacade,
  userId: string,
  lookId: string,
  pieces: Piece[],
  bodyId: string,
  bodyHue: number,
  model: "classic" | "slim",
): Promise<string | null> {
  try {
    if (pieces.length === 0) return null
    const { isoOutfitThumb } = await import("../../skin/iso")
    const thumb = await isoOutfitThumb(pieces, bodyId, bodyHue, model)
    const source = await fetch(thumb.url)
    if (!source.ok) return null
    const blob = await source.blob()
    const path = `${userId}/${lookId}.thumb.png`
    const { error } = await client.storage
      .from("garments")
      .upload(path, blob, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: true,
      })
    if (error) return null
    const { data } = client.storage.from("garments").getPublicUrl(path)
    return data.publicUrl
  } catch {
    return null
  }
}
