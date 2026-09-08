import { describe, expect, it } from "vitest"
import { SkinStage } from "./SkinStage"

describe("SkinStage", () => {
  it("exports the live preview", () => {
    expect(typeof SkinStage).toBe("function")
  })
})
