import { describe, expect, it } from "vitest"
import {
  COLLECTION_CATEGORY_ORDER,
  focusForPiece,
  pieceCovers,
  preparePreview,
  SLOT_BADGE_COLOR,
  SLOT_GROUP,
  SLOT_LABEL,
  SLOT_STACK,
  visibleCovers,
  type Piece,
} from "./pieceTypes"

function piece(partial: Partial<Piece> & Pick<Piece, "id" | "slot" | "group">): Piece {
  return {
    name: partial.id,
    maker: "System",
    savedCount: 0,
    likeCount: 0,
    added: 0,
    blurb: "",
    skin: "",
    ...partial,
  }
}

describe("pieceTypes", () => {
  it("defaults covers to the piece group", () => {
    const hat = piece({ id: "h", slot: "hat", group: "head" })
    expect(pieceCovers(hat)).toEqual(["head"])
    expect(focusForPiece(hat)).toBe("head")
  })

  it("keeps long-hair torso overlay paint on head pieces", () => {
    const hair = piece({ id: "h", slot: "hair", group: "head" })
    expect(visibleCovers(hair, ["head"])).toEqual(["head"])
    expect(visibleCovers(hair, ["head", "torso"])).toEqual(["head", "torso"])
    expect(visibleCovers(hair, ["head", "torso", "legs"])).toEqual(["head", "torso"])
  })

  it("uses declared covers for focus and paint clipping", () => {
    const pants = piece({
      id: "p",
      slot: "pants",
      group: "legs",
      covers: ["torso", "legs"],
    })
    expect(pieceCovers(pants)).toEqual(["torso", "legs"])
    expect(focusForPiece(pants)).toBe("full")
    expect(visibleCovers(pants, ["head", "torso", "legs"])).toEqual(["torso", "legs"])
    expect(visibleCovers(pants, ["head"])).toEqual(["torso", "legs"])
  })

  it("preparePreview crops single pieces and leaves full-figure wide", () => {
    const coat = piece({
      id: "c",
      slot: "coat",
      group: "torso",
      covers: ["torso", "legs"],
    })
    expect(preparePreview([coat], ["head", "torso", "legs"])).toEqual({
      covers: ["torso", "legs"],
      group: "full",
    })
    expect(preparePreview([coat], ["head", "torso", "legs"], { fullFigure: true })).toEqual({
      covers: undefined,
      group: "full",
    })
    expect(preparePreview([coat, coat], ["torso"], { fullFigure: false })).toEqual({
      covers: undefined,
      group: "full",
    })
  })

  it("keeps stack order and slot→group map aligned", () => {
    expect(SLOT_STACK[0]).toBe("eyes")
    expect(SLOT_GROUP.pants).toBe("legs")
    expect(SLOT_GROUP.coat).toBe("torso")
  })

  it("layers a set above shirt so outer clothes paint over it", () => {
    const shirt = SLOT_STACK.indexOf("shirt")
    const set = SLOT_STACK.indexOf("set")
    const coat = SLOT_STACK.indexOf("coat")
    const pants = SLOT_STACK.indexOf("pants")
    expect(set).toBeGreaterThan(shirt)
    expect(set).toBeLessThan(coat)
    expect(set).toBeLessThan(pants)
  })

  it("treats set as a torso fallback group with a label", () => {
    expect(SLOT_GROUP.set).toBe("torso")
    expect(SLOT_LABEL.set).toBe("Set")
  })

  it("gives every slot a steel hex badge color", () => {
    expect(Object.keys(SLOT_BADGE_COLOR).sort()).toEqual(
      ["coat", "eyes", "face", "hair", "hat", "pants", "set", "shirt", "shoes"].sort(),
    )
    for (const color of Object.values(SLOT_BADGE_COLOR)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it("steps the badge ladder so slots stay distinguishable in grayscale", () => {
    const luminance = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16)
      return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff)
    }
    const levels = Object.values(SLOT_BADGE_COLOR).map(luminance)
    expect(new Set(levels).size).toBe(levels.length)
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(220)
  })

  it("orders collection categories starting with hat, hair, eyes, face, shirt, coat, pants, shoes, set", () => {
    expect(COLLECTION_CATEGORY_ORDER).toEqual([
      "hat",
      "hair",
      "eyes",
      "face",
      "shirt",
      "coat",
      "pants",
      "shoes",
      "set",
    ])
  })
})
