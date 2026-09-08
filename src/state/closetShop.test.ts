import { describe, expect, it } from "vitest"
import { pieces } from "../data/catalog"
import { persistDefaults } from "./persist"
import { buyAndWearPiece, buyPiece, wearOwned } from "./closetShop"

const testPiece = pieces[0]

describe("closetShop", () => {
  it("adds a piece to wardrobe", () => {
    const { next, message } = buyPiece(persistDefaults, testPiece.id)
    expect(next.owned).toContain(testPiece.id)
    expect(message).toMatch(/Added .* to wardrobe/)
  })

  it("refuses to wear a piece not in wardrobe", () => {
    const { next, message } = wearOwned(persistDefaults, testPiece.id)
    expect(next.equipped).toEqual({})
    expect(message).toMatch(/wardrobe/)
  })

  it("adds and wears in one step", () => {
    const { next, message } = buyAndWearPiece(persistDefaults, testPiece.id)
    expect(next.owned).toContain(testPiece.id)
    expect(next.equipped[testPiece.slot]).toBe(testPiece.id)
    expect(message).toMatch(/Added and wearing/)
  })

  it("wears bundled eyes without requiring prior wardrobe purchase", () => {
    const { next, message } = wearOwned(persistDefaults, "eye-01")
    expect(next.equipped.eyes).toBe("eye-01")
    expect(next.stack).toContain("eye-01")
    expect(message).toBe("Wearing Eyes #01.")
  })

  it("adjusts eye offset silently without a wear toast", () => {
    const equipped = wearOwned(persistDefaults, "eye-01").next
    const { next, message } = wearOwned(equipped, "eye-01@-2")
    expect(next.equipped.eyes).toBe("eye-01@-2")
    expect(next.stack).toContain("eye-01@-2")
    expect(next.stack).not.toContain("eye-01")
    expect(message).toBeUndefined()
  })

  it("still toasts when switching to a different eye", () => {
    const equipped = wearOwned(persistDefaults, "eye-01").next
    const { next, message } = wearOwned(equipped, "eye-02@-1")
    expect(next.equipped.eyes).toBe("eye-02@-1")
    expect(message).toBe("Wearing Eyes #02.")
  })
})
