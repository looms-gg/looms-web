import type { Group, Piece, Slot } from "./catalog"
import { SLOT_GROUP } from "./catalog"
import seed from "./catalog-seed.json" with { type: "json" }

const FIXTURE_SKIN =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

export type CatalogSeed = {
  id: string
  name: string
  slot: Slot
  group: Group
  saved_count: number
  added: number
  blurb: string
  file: string
  covers?: Group[]
}

export const catalogSeed = seed as CatalogSeed[]

export const AUTHOR_USER_ID = "45e6be54-c9a5-4627-af39-9c14b27ec92e"
export const AUTHOR_USERNAME = "ser0th"

export function fixturePieces(maker = AUTHOR_USERNAME, skin = FIXTURE_SKIN): Piece[] {
  return catalogSeed.map((row) => ({
    id: row.id,
    name: row.name,
    slot: row.slot,
    group: row.group ?? SLOT_GROUP[row.slot],
    maker,
    savedCount: row.saved_count,
    likeCount: 0,
    added: row.added,
    blurb: row.blurb,
    skin,
    covers: row.covers,
  }))
}
