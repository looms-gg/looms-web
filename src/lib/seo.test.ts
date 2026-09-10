import { describe, expect, it } from "vitest"
import {
  lookCanonicalUrl,
  lookSeoDescription,
  lookSeoTitle,
  pieceCanonicalUrl,
  pieceSeoDescription,
  pieceSeoHeading,
  pieceSeoTitle,
  isThinPieceSeo,
  truncateSeoText,
  creativeWorkJsonLd,
  THIN_SEO_TEXT_LENGTH,
} from "./seo"

describe("pieceCanonicalUrl", () => {
  it("uses the production origin with the piece path", () => {
    expect(pieceCanonicalUrl("ink-fall")).toBe("https://looms.gg/piece/ink-fall")
  })

  it("encodes piece ids", () => {
    expect(pieceCanonicalUrl("weird id")).toBe("https://looms.gg/piece/weird%20id")
  })
})

describe("lookCanonicalUrl", () => {
  it("uses the production origin with the look path", () => {
    expect(lookCanonicalUrl("abc-123")).toBe("https://looms.gg/look/abc-123")
  })
})

describe("pieceSeoTitle", () => {
  it("is keyword-aware: name, slot, minecraft keyword, brand", () => {
    expect(pieceSeoTitle({ id: "winter-coat", name: "Winter Coat", slot: "coat" })).toBe(
      "Winter Coat — COAT Minecraft clothing piece | looms",
    )
  })
})

describe("pieceSeoHeading", () => {
  it("uses the human slot label", () => {
    expect(pieceSeoHeading({ id: "winter-coat", name: "Winter Coat", slot: "coat" })).toBe(
      "Winter Coat — Minecraft coat layer",
    )
  })

  it("falls back to clothing for unknown slots", () => {
    expect(pieceSeoHeading({ id: "x", name: "X", slot: "mystery" })).toBe("X — Minecraft clothing layer")
  })
})

describe("pieceSeoDescription", () => {
  it("leads with the blurb when present", () => {
    const desc = pieceSeoDescription({ id: "p", name: "P", slot: "shirt", blurb: "A cozy top." })
    expect(desc).toBe("A cozy top. · SHIRT · Minecraft clothing on looms")
  })

  it("falls back to a name+slot sentence when no blurb", () => {
    const desc = pieceSeoDescription({ id: "p", name: "Plain Piece", slot: "pants" })
    expect(desc).toBe("Plain Piece (PANTS) — modular Minecraft clothing piece on looms.")
  })

  it("clamps long descriptions to 160 chars at a word boundary with an ellipsis", () => {
    const desc = pieceSeoDescription({ id: "p", name: "P", slot: "shirt", blurb: "word ".repeat(60) })
    expect(desc.length).toBeLessThanOrEqual(160)
    expect(desc.endsWith("…")).toBe(true)
  })
})

describe("lookSeoTitle / lookSeoDescription", () => {
  it("titles look pages with the outfit keyword", () => {
    expect(lookSeoTitle({ id: "l", name: "Winter Explorer" })).toBe("Winter Explorer — Minecraft outfit | looms")
  })

  it("uses the description when present", () => {
    const desc = lookSeoDescription({ id: "l", name: "L", description: "Cozy layers." })
    expect(desc).toBe("Cozy layers. · Minecraft outfit on looms")
  })

  it("falls back when description is empty", () => {
    const desc = lookSeoDescription({ id: "l", name: "Winter Explorer", description: "" })
    expect(desc).toBe(
      "Winter Explorer — community Minecraft outfit on looms. Preview in 3D and export the skin free.",
    )
  })
})

describe("isThinPieceSeo", () => {
  it("marks missing or short blurbs as thin", () => {
    expect(isThinPieceSeo({ blurb: null })).toBe(true)
    expect(isThinPieceSeo({ blurb: "" })).toBe(true)
    expect(isThinPieceSeo({ blurb: "short" })).toBe(true)
  })

  it("accepts blurbs at or above the threshold", () => {
    const longEnough = "x".repeat(THIN_SEO_TEXT_LENGTH)
    expect(isThinPieceSeo({ blurb: longEnough })).toBe(false)
  })
})

describe("truncateSeoText", () => {
  it("returns short text untouched", () => {
    expect(truncateSeoText("hello world")).toBe("hello world")
  })

  it("cuts on a word boundary and appends an ellipsis", () => {
    const out = truncateSeoText("one two three four", 10)
    expect(out.endsWith("…")).toBe(true)
    expect(out.length).toBeLessThanOrEqual(10)
  })
})

describe("creativeWorkJsonLd", () => {
  it("builds a schema.org CreativeWork with the required fields", () => {
    const ld = creativeWorkJsonLd({
      name: "Ink Fall",
      description: "Hair piece",
      url: "https://looms.gg/piece/ink-fall",
      image: "https://looms.gg/og/pieces/ink-fall.png",
    })
    expect(ld["@type"]).toBe("CreativeWork")
    expect(ld.isAccessibleForFree).toBe(true)
    expect(ld.inLanguage).toBe("en")
  })
})
