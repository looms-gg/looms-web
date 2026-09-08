import { describe, expect, it } from "vitest"
import { StudioPage } from "./StudioPage"

describe("StudioPage", () => {
  it("exports the studio screen", () => {
    expect(typeof StudioPage).toBe("function")
  })
})
