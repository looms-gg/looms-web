import { getEyePiece } from "./eyes"
import type { Piece } from "./pieceTypes"

export type {
  ClothingSlot,
  Group,
  Piece,
  Slot,
} from "./pieceTypes"
export {
  CLOTHING_SLOTS,
  focusForPiece,
  GROUP_LABEL,
  GROUPS,
  pieceCovers,
  preparePreview,
  SLOT_GROUP,
  SLOT_LABEL,
  SLOT_STACK,
  SLOTS,
  visibleCovers,
} from "./pieceTypes"

export let pieces: Piece[] = []
let pieceById = new Map<string, Piece>()

// The module registry is the single source of truth: it backs the synchronous
// lookups (getPiece via data/outfit, skin composition) that run outside React.
// The CatalogProvider subscribes below and mirrors it into React state, so no
// consumer ever hand-maintains a second copy.
type CatalogListener = () => void
const listeners = new Set<CatalogListener>()

export function subscribeToCatalog(listener: CatalogListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyCatalogChanged() {
  for (const listener of listeners) listener()
}

export function replaceCatalog(next: Piece[]) {
  pieces = next
  pieceById = new Map(next.map((piece) => [piece.id, piece]))
  notifyCatalogChanged()
  return pieces
}

export function upsertPiece(piece: Piece) {
  const index = pieces.findIndex((row) => row.id === piece.id)
  pieces = index === -1 ? [...pieces, piece] : pieces.map((row) => (row.id === piece.id ? piece : row))
  pieceById.set(piece.id, piece)
  notifyCatalogChanged()
  return pieces
}

export function getPiece(id: string) {
  return pieceById.get(id) ?? getEyePiece(id)
}
