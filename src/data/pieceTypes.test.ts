import { describe, expect, it } from "vitest"
import {
  focusForPiece,
  pieceCovers,
  preparePreview,
  SLOT_GROUP,
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
})
