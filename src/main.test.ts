import { describe, expect, it } from "vitest"
import { boot } from "./main"

describe("boot", () => {
  it("skips createRoot when the mount node is missing", () => {
    expect(boot(null)).toBe(false)
  })
})
