import { describe, expect, it } from "vitest"
import { parseWardrobeTab, wardrobeTabQuery } from "./wardrobeTab"

describe("wardrobeTab", () => {
  it("defaults to looks", () => {
    expect(parseWardrobeTab("")).toBe("looks")
    expect(parseWardrobeTab("?foo=1")).toBe("looks")
    expect(parseWardrobeTab("?tab=nope")).toBe("looks")
  })

  it("reads pieces from the query", () => {
    expect(parseWardrobeTab("?tab=pieces")).toBe("pieces")
    expect(parseWardrobeTab("tab=pieces")).toBe("pieces")
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
