import { supabase, type GarmentRow } from "../../lib/supabase";
import {
  GROUPS,
  SLOT_GROUP,
  type Group,
  type Slot,
} from "../../data/catalog";
import { MAX_LIMITS, sanitizeText, sanitizeUsername } from "../../lib/sanitize";
import { formatErrorMessage } from "../../lib/errorFormat";

/** A set is a multi-region garment (bikini, tracksuit): one texture paints torso and legs. */
export function coversForSlot(slot: Slot): Group[] {
  return slot === "set" ? ["torso", "legs"] : [SLOT_GROUP[slot]];
}

/** Covers persist what the texture actually paints, so long hair keeps its torso overlay. */
export function uploadCovers(slot: Slot, painted: Group[]): Group[] {
  const declared = coversForSlot(slot);
  return GROUPS.filter(
    (group) => declared.includes(group) || painted.includes(group),
  );
}

export interface PublishGarmentArgs {
  userId: string;
  username?: string | null;
  textureBlob: Blob;
  name: string;
  description: string;
  slot: Slot;
  isPublic: boolean;
  painted: Group[];
}

export interface PublishGarmentResult {
  pieceId: string;
  row: GarmentRow;
  maker: string;
}

/**
 * Upload a garment texture to the `garments` bucket and insert its row.
 * The storage path is scoped to the uploader's user id, counters start at
 * zero, and `moderation_state` is left to its database default.
 */
export async function publishGarmentTexture(
  args: PublishGarmentArgs,
): Promise<PublishGarmentResult | { error: string }> {
  try {
    const pieceId = crypto.randomUUID();
    const storagePath = `${args.userId}/${pieceId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("garments")
      .upload(storagePath, args.textureBlob, {
        contentType: "image/png",
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("garments").getPublicUrl(storagePath);

    const maker = args.username ? sanitizeUsername(args.username) : "you";
    const pieceName =
      sanitizeText(args.name, MAX_LIMITS.PIECE_NAME) || "Untitled Piece";
    const pieceDescription = sanitizeText(
      args.description,
      MAX_LIMITS.PIECE_DESCRIPTION,
      { multiline: true },
    );
    const covers = uploadCovers(args.slot, args.painted);

    const row: GarmentRow = {
      id: pieceId,
      user_id: args.userId,
      name: pieceName,
      description: pieceDescription || null,
      slot: args.slot,
      body_group: SLOT_GROUP[args.slot],
      saved_count: 0,
      like_count: 0,
      added: Date.now(),
      covers,
      texture_url: publicUrl,
      is_public: args.isPublic,
      tags: [],
      created_at: new Date().toISOString(),
    };

    const { error: dbError } = await supabase.from("garments").insert(row);
    if (dbError) {
      throw new Error(`Failed to save garment record: ${dbError.message}`);
    }

    return { pieceId, row, maker };
  } catch (err: unknown) {
    return { error: formatErrorMessage(err) };
  }
}
