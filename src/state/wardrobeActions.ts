import { getPiece } from "../data/catalog"
import { parseEyeId } from "../data/eyes"
import { bodyOrDefault } from "../data/bodies"
import { wearInStack, mergeStack } from "../data/outfit"
import type { Persist } from "./persist"

export function setBodyPersist(prev: Persist, bodyId: string) {
  const id = bodyOrDefault(bodyId).id
  return {
    next: {
      ...prev,
      bodyId: id,
      bodyHue: id === prev.bodyId ? prev.bodyHue : 0,
    },
  }
}

export function addPiece(prev: Persist, pieceId: string) {
  const piece = getPiece(pieceId)
  if (!piece) return { next: prev }
  if (prev.owned.includes(pieceId)) {
    return { next: prev, message: `${piece.name} is already in your wardrobe.` }
  }
  return {
    next: {
      ...prev,
      owned: [...prev.owned, pieceId],
    },
    message: `Added ${piece.name} to wardrobe.`,
  }
}

export function wearOwned(prev: Persist, pieceId: string) {
  const piece = getPiece(pieceId)
  if (!piece) return { next: prev }
  if (piece.slot !== "eyes" && !prev.owned.includes(pieceId)) {
    return { next: prev, message: `Add ${piece.name} to wardrobe first.` }
  }
  const previousId = prev.equipped[piece.slot]
  if (previousId === pieceId) return { next: prev }

  const equipped = { ...prev.equipped, [piece.slot]: pieceId }
  const next = {
    ...prev,
    equipped,
    stack: wearInStack(prev.stack, equipped, piece, previousId),
  }

  // Same eye base with a different height offset — update quietly.
  if (
    piece.slot === "eyes" &&
    previousId &&
    parseEyeId(previousId).baseId === parseEyeId(pieceId).baseId
  ) {
    return { next }
  }

  return {
    next,
    message: `Wearing ${piece.name}.`,
  }
}

export function addAndWearPiece(prev: Persist, pieceId: string) {
  const piece = getPiece(pieceId)
  if (!piece) return { next: prev }
  const ownedAlready = prev.owned.includes(pieceId)
  const previousId = prev.equipped[piece.slot]
  const equipped = { ...prev.equipped, [piece.slot]: pieceId }
  return {
    next: {
      ...prev,
      owned: ownedAlready ? prev.owned : [...prev.owned, pieceId],
      equipped,
      stack: wearInStack(prev.stack, equipped, piece, previousId),
    },
    message: ownedAlready
      ? `Wearing ${piece.name}.`
      : `Added and wearing ${piece.name}.`,
  }
}

export function removePiece(prev: Persist, pieceId: string) {
  const piece = getPiece(pieceId)
  if (!piece || !prev.owned.includes(pieceId)) return { next: prev }
  const equipped = { ...prev.equipped }
  if (equipped[piece.slot] === pieceId) delete equipped[piece.slot]
  return {
    next: {
      ...prev,
      owned: prev.owned.filter((id) => id !== pieceId),
      equipped,
      stack: mergeStack(prev.stack, equipped),
    },
    message: `Removed ${piece.name} from wardrobe.`,
  }
}
