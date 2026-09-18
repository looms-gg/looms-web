import type { SkinModel } from "../data/model"

/**
 * Short fingerprint of a piece's texture URL. Overwrites keep the piece id and
 * only bump the texture_url query (see piecePublish/overwritePieceTexture), so
 * thumbs keyed on the id alone would pin the pre-overwrite render forever.
 * FNV-1a 32-bit, base36 — a cheap, stable key component that also stays tiny for
 * system pieces whose `skin` is an inline data URL.
 */
export function skinHash(skin: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < skin.length; i++) {
    hash ^= skin.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** Shared by the live render pipeline (skin/iso) and the static-thumb path. */
export function isoPieceCacheKey(
  model: SkinModel,
  bakeFx: boolean,
  piece: { id: string; skin: string },
): string {
  return `piece:v77:${model}:${bakeFx ? "fx" : "raw"}:${piece.id}:${skinHash(piece.skin)}`
}
