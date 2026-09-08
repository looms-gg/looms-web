import { describe, expect, it } from "vitest"
import { ExplorePage } from "./ExplorePage"

describe("ExplorePage", () => {
  it("exports a page component", () => {
    expect(typeof ExplorePage).toBe("function")
  })
})
