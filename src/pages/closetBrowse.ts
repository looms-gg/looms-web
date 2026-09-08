import { SLOT_LABEL, type Piece } from "../data/catalog"
import type { LayerFilter, Sort } from "../components/ClosetRail"

export function filterClosetPieces(
  pieces: Piece[],
  query: string,
  layer: LayerFilter,
  sort: Sort,
) {
  const q = query.trim().toLowerCase()
  const list = pieces.filter((piece) => {
    if (layer !== "all" && piece.slot !== layer) return false
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
