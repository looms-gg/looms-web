import { describe, expect, it } from "vitest"
import { ClosetPage } from "./ClosetPage"

describe("ClosetPage", () => {
  it("exports the closet screen", () => {
    expect(typeof ClosetPage).toBe("function")
  })
})
