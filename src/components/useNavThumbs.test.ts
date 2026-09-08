import { describe, expect, it } from "vitest"
import { useNavThumbs } from "./useNavThumbs"

describe("useNavThumbs", () => {
  it("exports a nav thumb hook", () => {
    expect(typeof useNavThumbs).toBe("function")
  })
})
