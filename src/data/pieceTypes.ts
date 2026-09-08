export const GROUPS = ["head", "torso", "legs"] as const
export type Group = (typeof GROUPS)[number]

export const CLOTHING_SLOTS = ["hair", "hat", "face", "shirt", "coat", "pants", "shoes"] as const
export type ClothingSlot = (typeof CLOTHING_SLOTS)[number]

export const SLOTS = ["eyes", "hair", "hat", "face", "shirt", "coat", "pants", "shoes"] as const
export type Slot = (typeof SLOTS)[number]

/** Bottom → top. A higher piece punches the second (outer) Minecraft layer of pieces below it. */
export const SLOT_STACK: Slot[] = [
  "eyes",
  "shirt",
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
  /**
   * Body regions this garment actually paints.
   * Closet rack still uses `group`; iso and live previews honor this list.
   */
  covers?: Group[]
  userId?: string
  isPublic?: boolean
  offsetY?: number
}

export const SLOT_LABEL: Record<Slot, string> = {
  eyes: "Eyes",
  hair: "Hair",
  hat: "Hat",
  face: "Face",
  shirt: "Shirt",
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
  return covers.length ? covers : declared
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
