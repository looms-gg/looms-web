import type { SupabaseFacade } from "../supabase"
import type { Piece } from "../../data/pieceTypes"

/**
 * Bake a piece thumbnail with the real render engine and upload it next to
 * the garment texture. Best-effort by contract: any failure returns null and
 * the caller's publish/overwrite proceeds unchanged — a missing thumb just
 * falls back to live client rendering.
 */
export async function bakeAndUploadThumb(
  client: SupabaseFacade,
  userId: string,
  pieceId: string,
  piece: Piece,
): Promise<string | null> {
  try {
    const { isoPieceThumb } = await import("../../skin/iso")
    const thumb = await isoPieceThumb(piece, "classic")
    const source = await fetch(thumb.url)
    if (!source.ok) return null
    const blob = await source.blob()
    const path = `${userId}/${pieceId}.thumb.png`
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
