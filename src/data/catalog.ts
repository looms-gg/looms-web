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
  SLOT_GROUP,
  SLOT_LABEL,
  SLOT_STACK,
  SLOTS,
  visibleCovers,
} from "./pieceTypes"

export let pieces: Piece[] = []
let pieceById = new Map<string, Piece>()

export function replaceCatalog(next: Piece[]) {
  pieces = next
  pieceById = new Map(next.map((piece) => [piece.id, piece]))
  return pieces
}

export function upsertPiece(piece: Piece) {
  const index = pieces.findIndex((row) => row.id === piece.id)
  pieces = index === -1 ? [...pieces, piece] : pieces.map((row) => (row.id === piece.id ? piece : row))
  pieceById.set(piece.id, piece)
  return pieces
}

export function getPiece(id: string) {
  return pieceById.get(id) ?? getEyePiece(id)
}
