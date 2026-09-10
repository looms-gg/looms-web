import { describe, expect, it } from "vitest"
import {
  focusForPiece,
  pieceCovers,
  preparePreview,
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
})
