import { GROUPS, SLOTS, SLOT_GROUP, type Group, type Piece, type Slot } from "./catalog"

export type GarmentRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  slot: string
  body_group: string
  saved_count: number
  like_count: number
  added: number
  covers: string[]
  texture_url: string
  thumb_url: string | null
  is_public: boolean
  tags: string[]
  created_at: string
}

export function isSlot(value: string): value is Slot {
  return (SLOTS as readonly string[]).includes(value)
}

export function isGroup(value: string): value is Group {
  return (GROUPS as readonly string[]).includes(value)
}

export function garmentToPiece(row: GarmentRow, maker: string): Piece {
  const slot = isSlot(row.slot) ? row.slot : "shirt"
  const covers = (row.covers ?? []).filter(isGroup)
  return {
    id: row.id,
    name: row.name,
    slot,
    group: isGroup(row.body_group) ? row.body_group : SLOT_GROUP[slot],
    maker,
    savedCount: row.saved_count,
    likeCount: row.like_count,
    added: row.added,
    blurb: row.description ?? "",
    skin: row.texture_url,
    thumb: row.thumb_url ?? undefined,
    covers: covers.length ? covers : undefined,
    userId: row.user_id,
    isPublic: row.is_public,
  }
}
