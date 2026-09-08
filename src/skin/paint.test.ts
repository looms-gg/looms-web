import { describe, expect, it } from "vitest"
import { makeSkinCanvas } from "./paint"

describe("paint", () => {
  it("exports a skin atlas factory", () => {
    expect(typeof makeSkinCanvas).toBe("function")
  })
})
