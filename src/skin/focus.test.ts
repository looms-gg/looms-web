import { describe, expect, it } from "vitest"
import { getPiece } from "../data/catalog"
import { isoStillShot, skinviewModel } from "./focus"

describe("skinviewModel", () => {
  it("maps arm fit onto skinview3d model names", () => {
    expect(skinviewModel("slim")).toBe("slim")
    expect(skinviewModel("classic")).toBe("default")
  })
})

describe("isoStillShot", () => {
  it("frames headless shirts with hanging legs on the chest", () => {
    const sweater = getPiece("christmas-sweater")!
    const plaid = getPiece("open-plaid")!
    const shown = { head: false, body: true, legs: true }
    expect(isoStillShot([sweater], shown)).toBe("long")
    expect(isoStillShot([plaid], shown)).toBe("long")
  })

  it("keeps hooded coats on the coat shot", () => {
    const coat = getPiece("winter-coat")!
    expect(isoStillShot([coat], { head: true, body: true, legs: true })).toBe("coat")
  })

  it("frames torso-only tops as coats", () => {
    const hoodie = getPiece("pink-hoodie")!
    expect(isoStillShot([hoodie], { head: false, body: true, legs: false })).toBe(
      "coat",
    )
  })
})
