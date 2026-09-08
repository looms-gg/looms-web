import { describe, expect, it } from "vitest"
import { parseTheme } from "./theme"

describe("parseTheme", () => {
  it("accepts the two looms themes and legacy skinplex themes", () => {
    expect(parseTheme("looms")).toBe("looms")
    expect(parseTheme("looms-light")).toBe("looms-light")
    expect(parseTheme("skinplex")).toBe("looms")
    expect(parseTheme("skinplex-light")).toBe("looms-light")
  })

  it("falls back to dark for junk", () => {
    expect(parseTheme(null)).toBe("looms")
    expect(parseTheme("solarized")).toBe("looms")
  })
})
