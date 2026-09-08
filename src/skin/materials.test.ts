import { describe, expect, it } from "vitest"
import { flattenSkinMaterials } from "./materials"

describe("flattenSkinMaterials", () => {
  it("exports a callable material flattener", () => {
    expect(typeof flattenSkinMaterials).toBe("function")
  })
})
