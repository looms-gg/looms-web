import { supabase } from "../supabase"
import { type Group, type Piece, type Slot } from "../../data/catalog"
import { garmentToPiece, type GarmentRow } from "../../data/garment"
import { uploadCovers, uploadGarmentTexture } from "./publishGarment"
import { bakeAndUploadThumb } from "./thumbUpload"

export interface OverwritePieceArgs {
  userId: string
  pieceId: string
  slot: Slot
  textureBlob: Blob
  painted: Group[]
}

export type OverwritePieceResult = { piece: Piece } | { error: Error }

/**
 * Replace an owned piece's texture in place. The storage path is derived from
 * the owner's user id and the piece id (never parsed from texture_url), the
 * row keeps its counters and ownership (client-immutable triggers), and
 * texture_url gains a cache-busting `?v=` so the CDN serves the new PNG.
 */
export async function overwritePieceTexture(
  args: OverwritePieceArgs,
): Promise<OverwritePieceResult> {
  try {
    const publicUrl = await uploadGarmentTexture(
      args.userId,
      args.pieceId,
      args.textureBlob,
    )
    const textureUrl = `${publicUrl}?v=${Date.now()}`
    const covers = uploadCovers(args.slot, args.painted)
    const { error: dbError } = await supabase
      .from("garments")
      .update({ covers, texture_url: textureUrl })
      .eq("id", args.pieceId)
    if (dbError) {
      throw new Error(`Failed to update garment record: ${dbError.message}`)
    }

    const { data: updatedRow, error: readError } = await supabase
      .from("garments")
      .select("*")
      .eq("id", args.pieceId)
      .single()
    if (readError || !updatedRow) {
      throw new Error("Failed to read back the updated piece.")
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", args.userId)
      .single()
    if (profileError || !profile) {
      throw new Error("Failed to read back the piece maker.")
    }

    const piece = garmentToPiece(updatedRow as GarmentRow, profile.username)

    const thumbUrl = await bakeAndUploadThumb(supabase, args.userId, args.pieceId, piece)
    if (thumbUrl) {
      const busted = `${thumbUrl}?v=${Date.now()}`
      const { error: thumbDbError } = await supabase
        .from("garments")
        .update({ thumb_url: busted })
        .eq("id", args.pieceId)
      if (!thumbDbError) piece.thumb = busted
    }

    return { piece }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}
