import { describe, expect, it } from "vitest"
import {
  CUBOID_FACES,
  HAT,
  HEAD,
  SLIM_RIGHT_SLEEVE,
  SLIM_LEFT_SLEEVE,
  innerOuterPairs,
} from "./uv"

describe("uv cuboids", () => {
  it("maps inner head to the standard 64 atlas", () => {
    expect(HEAD.front).toEqual({ x: 8, y: 8, w: 8, h: 8 })
    expect(HAT.front).toEqual({ x: 40, y: 8, w: 8, h: 8 })
  })

  it("lists every cuboid face", () => {
    expect(CUBOID_FACES).toHaveLength(6)
  })

  it("defines slim sleeve cuboids accurately with 3px width", () => {
    expect(SLIM_RIGHT_SLEEVE.front).toEqual({ x: 44, y: 36, w: 3, h: 12 })
    expect(SLIM_RIGHT_SLEEVE.back).toEqual({ x: 51, y: 36, w: 3, h: 12 })
    expect(SLIM_LEFT_SLEEVE.front).toEqual({ x: 52, y: 52, w: 3, h: 12 })
    expect(SLIM_LEFT_SLEEVE.back).toEqual({ x: 59, y: 52, w: 3, h: 12 })
  })

  it("returns slim arm and sleeve cuboids when slim is true in innerOuterPairs", () => {
    const pairs = innerOuterPairs(true)
    const rightArmPair = pairs[2]
    expect(rightArmPair[0].front.w).toBe(3)
    expect(rightArmPair[1].front.w).toBe(3)

    const leftArmPair = pairs[3]
    expect(leftArmPair[0].front.w).toBe(3)
    expect(leftArmPair[1].front.w).toBe(3)
  })
})
