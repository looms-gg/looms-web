import { describe, expect, it } from "vitest"
import { pieces } from "./catalog"
import {
  equippedFromStack,
  equippedIds,
  findMatchingLook,
  isSameEquipped,
  mergeStack,
  moveStackId,
  piecesFromEquipped,
  resolveLookLayers,
  wearInStack,
  type Equipped,
} from "./outfit"

const shirt = pieces.find((piece) => piece.slot === "shirt")!
const coat = pieces.find((piece) => piece.slot === "coat")!
const hat = pieces.find((piece) => piece.slot === "hat")!

describe("outfit stack", () => {
  it("lists equipped ids in slot order", () => {
    const equipped: Equipped = { hat: hat.id, shirt: shirt.id }
    expect(equippedIds(equipped)).toEqual([hat.id, shirt.id])
  })

  it("inserts a new slot into the default stack order", () => {
    const equipped: Equipped = { shirt: shirt.id, coat: coat.id, hat: hat.id }
    expect(mergeStack([shirt.id], equipped)).toEqual([shirt.id, coat.id, hat.id])
  })

  it("keeps an existing stack when swapping a slot", () => {
    const otherShirt = pieces.find((piece) => piece.slot === "shirt" && piece.id !== shirt.id)!
    const equipped: Equipped = { shirt: otherShirt.id, hat: hat.id }
    const stack = [shirt.id, hat.id]
    expect(wearInStack(stack, equipped, otherShirt, shirt.id)).toEqual([
      otherShirt.id,
      hat.id,
    ])
  })

  it("moves a layer without wrapping", () => {
    const stack = [shirt.id, coat.id, hat.id]
    expect(moveStackId(stack, shirt.id, 1)).toEqual([coat.id, shirt.id, hat.id])
    expect(moveStackId(stack, shirt.id, -1)).toEqual(stack)
  })

  it("builds pieces from equipped ids", () => {
    const equipped: Equipped = { coat: coat.id }
    expect(piecesFromEquipped(equipped).map((piece) => piece.id)).toEqual([coat.id])
  })

  it("rebuilds equipped slots from a saved stack", () => {
    expect(equippedFromStack([shirt.id, hat.id])).toEqual({
      shirt: shirt.id,
      hat: hat.id,
    })
  })

  it("hydrates a look that only stored a stack", () => {
    const layers = resolveLookLayers({ equipped: {}, stack: [coat.id, shirt.id] })
    expect(layers.equipped.coat).toBe(coat.id)
    expect(layers.equipped.shirt).toBe(shirt.id)
    expect(piecesFromEquipped({}, [coat.id, shirt.id]).map((piece) => piece.id)).toEqual([
      coat.id,
      shirt.id,
    ])
  })

  it("compares equipped sets correctly with isSameEquipped", () => {
    expect(isSameEquipped({ shirt: shirt.id }, { shirt: shirt.id })).toBe(true)
    expect(isSameEquipped({ shirt: shirt.id }, { shirt: shirt.id, hat: hat.id })).toBe(false)
    expect(isSameEquipped({}, {})).toBe(true)
    expect(isSameEquipped(undefined, {})).toBe(true)
  })

  it("finds a matching look by equipped items and body attributes", () => {
    const look1 = {
      id: "look-1",
      name: "Casual",
      equipped: { shirt: shirt.id },
      bodyId: "slate",
      bodyHue: 0,
      model: "classic",
    }
    const look2 = {
      id: "look-2",
      name: "Formal",
      equipped: { shirt: shirt.id, coat: coat.id },
      bodyId: "slate",
      bodyHue: 10,
      model: "classic",
    }

    const matched = findMatchingLook([look1, look2], { shirt: shirt.id }, "slate", 0, "classic")
    expect(matched?.name).toBe("Casual")

    const notMatched = findMatchingLook([look1, look2], { shirt: shirt.id, hat: hat.id }, "slate", 0, "classic")
    expect(notMatched).toBeUndefined()
  })
})
