import { describe, expect, it } from "vitest"
import { parseWardrobeTab, wardrobeTabQuery } from "./wardrobeTab"

describe("wardrobeTab", () => {
  it("defaults to pieces", () => {
    expect(parseWardrobeTab("")).toBe("pieces")
    expect(parseWardrobeTab("?foo=1")).toBe("pieces")
    expect(parseWardrobeTab("?tab=nope")).toBe("pieces")
  })

  it("reads looks from the query", () => {
    expect(parseWardrobeTab("?tab=looks")).toBe("looks")
    expect(parseWardrobeTab("tab=looks")).toBe("looks")
  })

  it("reads uploads from the query", () => {
    expect(parseWardrobeTab("?tab=uploads")).toBe("uploads")
    expect(parseWardrobeTab("tab=uploads")).toBe("uploads")
  })

  it("serializes tab queries", () => {
    expect(wardrobeTabQuery("looks")).toBe("?tab=looks")
    expect(wardrobeTabQuery("pieces")).toBe("?tab=pieces")
    expect(wardrobeTabQuery("uploads")).toBe("?tab=uploads")
  })
})
