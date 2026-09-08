import { SLOTS, type Piece, type Slot } from "../../data/catalog"

export type StudioRackTab = "all" | "appearance" | Slot

export function emptyOwnedBySlot(): Record<Slot, Piece[]> {
  return Object.fromEntries(SLOTS.map((slot) => [slot, [] as Piece[]])) as Record<
    Slot,
    Piece[]
  >
}
