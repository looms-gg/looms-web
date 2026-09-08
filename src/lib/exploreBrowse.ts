import { SLOT_LABEL, type Piece, type Slot } from "../data/catalog"

export const SORTS = ["Newest", "Trending", "Most Saved"] as const
export type Sort = (typeof SORTS)[number]
export type SlotFilter = "all" | Slot

export function filterExplorePieces(
  pieces: Piece[],
  query: string,
  slot: SlotFilter,
  sort: Sort,
) {
  const q = query.trim().toLowerCase()
  const list = pieces.filter((piece) => {
    if (slot !== "all" && piece.slot !== slot) return false
    if (!q) return true
    return (
      piece.name.toLowerCase().includes(q) ||
      piece.maker.toLowerCase().includes(q) ||
      piece.slot.includes(q) ||
      SLOT_LABEL[piece.slot].toLowerCase().includes(q)
    )
  })
  return [...list].sort((a, b) => {
    if (sort === "Most Saved") return b.savedCount - a.savedCount
    if (sort === "Trending") return b.savedCount * b.added - a.savedCount * a.added
    return b.added - a.added
  })
}
