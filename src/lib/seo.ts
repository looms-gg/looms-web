/**
 * Shared SEO helpers: canonical URLs, keyword-aware titles/descriptions, and
 * JSON-LD builders. The prerender scripts (scripts/prerender-embeds.mjs,
 * scripts/generate-seo-files.mjs) duplicate this logic in plain JS because they
 * run after `vite build` outside the TS pipeline — keep them in sync.
 */

export const SITE_ORIGIN = "https://looms.gg"
export const SITE_NAME = "looms"

export type PieceSeoInput = {
  id: string
  name: string
  slot: string
  blurb?: string | null
}

export type LookSeoInput = {
  id: string
  name: string
  description?: string | null
}

/** Slot id → human label (kept in sync with src/data/pieceTypes.ts SLOT_LABEL). */
export const SEO_SLOT_LABELS: Record<string, string> = {
  eyes: "eyes",
  hair: "hair",
  hat: "hat",
  face: "face accessory",
  shirt: "shirt",
  set: "outfit set",
  coat: "coat",
  pants: "pants",
  shoes: "shoes",
}

export function seoSlotLabel(slot: string): string {
  return SEO_SLOT_LABELS[slot] ?? "clothing"
}

/** Canonical piece URL — always the production origin, never a preview host. */
export function pieceCanonicalUrl(pieceId: string): string {
  return `${SITE_ORIGIN}/piece/${encodeURIComponent(pieceId)}`
}

/** Canonical look URL — always the production origin, never a preview host. */
export function lookCanonicalUrl(lookId: string): string {
  return `${SITE_ORIGIN}/look/${encodeURIComponent(lookId)}`
}

/** Keyword-aware title for a piece page: "<Name> — <SLOT> Minecraft clothing piece | looms". */
export function pieceSeoTitle(piece: PieceSeoInput): string {
  return `${piece.name} — ${piece.slot.toUpperCase()} Minecraft clothing piece | ${SITE_NAME}`
}

/** One-h1 heading for a piece page: "<Name> — Minecraft <slot> layer". */
export function pieceSeoHeading(piece: PieceSeoInput): string {
  return `${piece.name} — Minecraft ${seoSlotLabel(piece.slot)} layer`
}

/** Meta description for a piece page, clamped to ~160 chars at a word boundary. */
export function pieceSeoDescription(piece: PieceSeoInput): string {
  const blurb = (piece.blurb ?? "").trim()
  const suffix = blurb
    ? `${blurb} · ${piece.slot.toUpperCase()} · Minecraft clothing on looms`
    : `${piece.name} (${piece.slot.toUpperCase()}) — modular Minecraft clothing piece on looms.`
  return truncateSeoText(suffix, 160)
}

/** Keyword-aware title for a look page: "<Name> — Minecraft outfit | looms". */
export function lookSeoTitle(look: LookSeoInput): string {
  return `${look.name} — Minecraft outfit | ${SITE_NAME}`
}

/** Meta description for a look page, clamped to ~160 chars at a word boundary. */
export function lookSeoDescription(look: LookSeoInput): string {
  const desc = (look.description ?? "").trim()
  const suffix = desc
    ? `${desc} · Minecraft outfit on looms`
    : `${look.name} — community Minecraft outfit on looms. Preview in 3D and export the skin free.`
  return truncateSeoText(suffix, 160)
}

/**
 * Indexation quality gate: uploads without a meaningful description are thin
 * content. Keep them crawlable (link discovery) but out of the index.
 */
export const THIN_SEO_TEXT_LENGTH = 40

export function isThinPieceSeo(piece: Pick<PieceSeoInput, "blurb">): boolean {
  return !piece.blurb || piece.blurb.trim().length < THIN_SEO_TEXT_LENGTH
}

/** Truncates on a word boundary with an ellipsis (shared 160-char SERP clamp). */
export function truncateSeoText(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text
  const slice = text.slice(0, maxLength)
  const cut = slice.lastIndexOf(" ")
  return `${(cut > maxLength * 0.6 ? slice.slice(0, cut) : slice).trimEnd()}…`
}

export function creativeWorkJsonLd(input: {
  name: string
  description: string
  url: string
  image: string
  genre?: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    isAccessibleForFree: true,
    ...(input.genre ? { genre: input.genre } : {}),
    inLanguage: "en",
  }
}
