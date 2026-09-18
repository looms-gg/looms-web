import { describe, expect, it } from "vitest"
import { poseGroupForParts, viewPixelRatio, viewerModelName, visibleSkinParts } from "./viewer"

describe("viewPixelRatio", () => {
  it("matches low-dpi devices exactly and caps high-dpi at 2", () => {
    expect(viewPixelRatio(1)).toBe(1)
    expect(viewPixelRatio(1.5)).toBe(1.5)
    expect(viewPixelRatio(2)).toBe(2)
    expect(viewPixelRatio(3)).toBe(2)
    expect(viewPixelRatio(0)).toBe(1)
  })
})

describe("viewerModelName", () => {
  it("maps arm fit onto skinview3d model names", () => {
    expect(viewerModelName("slim")).toBe("slim")
    expect(viewerModelName("classic")).toBe("default")
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

describe("visibleSkinParts", () => {
  it("shows every mesh in the group when no paint is supplied", () => {
    expect(visibleSkinParts("legs", ["legs"])).toMatchObject({
      rightLeg: true,
      leftLeg: true,
      head: false,
      body: false,
      rightArm: false,
      leftArm: false,
    })
  })

  it("narrows a single-piece preview to painted meshes", () => {
    // A body-only shirt: hide the bare arms even though it covers the torso.
    expect(visibleSkinParts("torso", ["torso"], ["body"])).toMatchObject({
      body: true,
      rightArm: false,
      leftArm: false,
    })
  })

  it("clips painted meshes to the declared covers", () => {
    // A head piece that also paints a torso overlay must not reveal the body.
    expect(visibleSkinParts("head", ["head"], ["head", "body"])).toMatchObject({
      head: true,
      body: false,
    })
  })

  it("falls back to the group when painted meshes are all clipped", () => {
    expect(visibleSkinParts("legs", ["legs"], ["head"])).toMatchObject({
      rightLeg: true,
      leftLeg: true,
    })
  })
})
