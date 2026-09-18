export const GROUPS = ["head", "torso", "legs"] as const
export type Group = (typeof GROUPS)[number]

export const CLOTHING_SLOTS = ["hair", "hat", "face", "shirt", "set", "coat", "pants", "shoes"] as const
export type ClothingSlot = (typeof CLOTHING_SLOTS)[number]

export const SLOTS = ["eyes", "hair", "hat", "face", "shirt", "set", "coat", "pants", "shoes"] as const
export type Slot = (typeof SLOTS)[number]

/** Top-to-bottom visual / sorting order for Studio collection categories:
 * hat, hair, eyes, face, shirt, coat, pants, shoes, set */
export const COLLECTION_CATEGORY_ORDER: readonly Slot[] = [
  "hat",
  "hair",
  "eyes",
  "face",
  "shirt",
  "coat",
  "pants",
  "shoes",
  "set",
] as const

/** Bottom → top. A higher piece punches the second (outer) Minecraft layer of pieces below it. */
// "set" sits just above "shirt": a set is a multi-region garment base (e.g. a
// bikini), so shirts and coats paint over its torso and pants over its legs.
export const SLOT_STACK: Slot[] = [
  "eyes",
  "shirt",
  "set",
  "coat",
  "pants",
  "shoes",
  "hair",
  "face",
  "hat",
]

export const SLOT_GROUP: Record<Slot, Group> = {
  eyes: "head",
  hair: "head",
  hat: "head",
  face: "head",
  shirt: "torso",
  set: "torso",
  coat: "torso",
  pants: "legs",
  shoes: "legs",
}

export type Piece = {
  id: string
  name: string
  slot: Slot
  group: Group
  maker: string
  savedCount: number
  likeCount: number
  added: number
  blurb: string
  /** 64×64 Minecraft skin PNG. Transparent pixels leave the base skin. */
  skin: string
  /** Pre-baked static thumbnail (Supabase storage or bundled seed PNG). */
  thumb?: string
  /**
   * Body regions this garment actually paints.
   * Wardrobe rack still uses `group`; iso and live previews honor this list.
   */
  covers?: Group[]
  userId?: string
  isPublic?: boolean
  offsetY?: number
}

/**
 * Muted badge color per slot for tile name slivers (faded to transparent in CSS).
 */
export const SLOT_BADGE_COLOR: Record<Slot, string> = {
  eyes: "#527d7a",
  hair: "#96604e",
  hat: "#8a6f4d",
  face: "#97718c",
  shirt: "#9a5a4a",
  set: "#7c5f8a",
  coat: "#5c7a55",
  pants: "#4e5f82",
  shoes: "#6b6f75",
}

export const SLOT_LABEL: Record<Slot, string> = {
  eyes: "Eyes",
  hair: "Hair",
  hat: "Hat",
  face: "Face",
  shirt: "Shirt",
  set: "Set",
  coat: "Coat",
  pants: "Pants",
  shoes: "Shoes",
}

export const GROUP_LABEL: Record<Group, string> = {
  head: "Head",
  torso: "Torso & arms",
  legs: "Legs",
}

export function pieceCovers(piece: Piece): Group[] {
  return piece.covers?.length ? piece.covers : [piece.group]
}

/** Atlas paint clipped to what the piece claims to cover. */
export function visibleCovers(piece: Piece, painted: Group[]): Group[] {
  const declared = pieceCovers(piece)
  const covers = painted.filter((group) => declared.includes(group))
  if (covers.length) {
    // Long hair paints its back strands on the torso overlay; never clip that
    // paint off a head piece or the render loses the fall of the hair.
    if (SLOT_GROUP[piece.slot] === "head") {
      if (painted.includes("torso") && !covers.includes("torso")) {
        return [...covers, "torso"]
      }
      return covers
    }
    return covers
  }
  return declared
}

/**
 * Shared live/iso preview framing: single-piece crops to visible covers;
 * full-figure and multi-piece outfits stay wide (`covers` undefined).
 */
export function preparePreview(
  outfit: Piece[],
  painted: Group[],
  options?: { fullFigure?: boolean },
): { covers: Group[] | undefined; group: Group | "full" } {
  if (options?.fullFigure || outfit.length !== 1) {
    return { covers: undefined, group: "full" }
  }
  const covers = visibleCovers(outfit[0], painted)
  return {
    covers,
    group: covers.length === 1 ? covers[0] : "full",
  }
}

export function focusForPiece(piece: Piece): Group | "full" {
  const covers = pieceCovers(piece)
  return covers.length === 1 ? covers[0] : "full"
}
