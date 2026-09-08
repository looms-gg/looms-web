import { describe, expect, it } from "vitest"
import { pieces } from "../data/catalog"
import { persistDefaults } from "./persist"
import { addAndWearPiece, addPiece, setBodyPersist, wearOwned } from "./closetActions"

const testPiece = pieces[0]

describe("closetActions", () => {
  it("adds a piece to wardrobe", () => {
    const { next, message } = addPiece(persistDefaults, testPiece.id)
    expect(next.owned).toContain(testPiece.id)
    expect(message).toMatch(/Added .* to wardrobe/)
  })

  it("refuses to wear a piece not in wardrobe", () => {
    const { next, message } = wearOwned(persistDefaults, testPiece.id)
    expect(next.equipped).toEqual({})
    expect(message).toMatch(/wardrobe/)
  })

  it("adds and wears in one step", () => {
    const { next, message } = addAndWearPiece(persistDefaults, testPiece.id)
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

  it("does not duplicate already-owned pieces", () => {
    const owned = { ...persistDefaults, owned: [testPiece.id] }
    const { next, message } = addPiece(owned, testPiece.id)
    expect(next.owned).toEqual([testPiece.id])
    expect(message).toMatch(/already in your wardrobe/)
  })

  it("wears an already-owned piece without duplicating ownership", () => {
    const owned = { ...persistDefaults, owned: [testPiece.id] }
    const { next, message } = addAndWearPiece(owned, testPiece.id)
    expect(next.owned).toEqual([testPiece.id])
    expect(next.equipped[testPiece.slot]).toBe(testPiece.id)
    expect(message).toMatch(/Wearing/)
  })

  it("resets body hue when switching bodies", () => {
    const tinted = { ...persistDefaults, bodyId: "body-1", bodyHue: 40 }
    const same = setBodyPersist(tinted, "body-1")
    expect(same.next.bodyHue).toBe(40)
    const switched = setBodyPersist(tinted, "body-2")
    expect(switched.next.bodyId).toBe("body-2")
    expect(switched.next.bodyHue).toBe(0)
  })
})
