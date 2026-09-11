import { describe, expect, it } from "vitest"
import { poseGroupForParts, skinviewModel } from "./focus"

describe("skinviewModel", () => {
  it("maps arm fit onto skinview3d model names", () => {
    expect(skinviewModel("slim")).toBe("slim")
    expect(skinviewModel("classic")).toBe("default")
  })
})

describe("poseGroupForParts", () => {
  it("collapses torso+legs to full", () => {
    expect(poseGroupForParts(["torso", "legs"])).toBe("full")
    expect(poseGroupForParts(["torso"])).toBe("torso")
    expect(poseGroupForParts(["legs"])).toBe("legs")
    expect(poseGroupForParts(["head"])).toBe("head")
  })
})
