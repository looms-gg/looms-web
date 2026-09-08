import { describe, expect, it } from "vitest"
import { parseProfileTab, profileTabQuery } from "./profileTab"

describe("profileTab", () => {
  it("defaults to uploads", () => {
    expect(parseProfileTab("")).toBe("uploads")
    expect(parseProfileTab("?foo=1")).toBe("uploads")
    expect(parseProfileTab("?tab=nope")).toBe("uploads")
  })

  it("reads looks and liked from the query", () => {
    expect(parseProfileTab("?tab=looks")).toBe("looks")
    expect(parseProfileTab("tab=liked")).toBe("liked")
    expect(parseProfileTab("?tab=uploads")).toBe("uploads")
  })

  it("serializes tab queries", () => {
    expect(profileTabQuery("uploads")).toBe("?tab=uploads")
    expect(profileTabQuery("looks")).toBe("?tab=looks")
    expect(profileTabQuery("liked")).toBe("?tab=liked")
  })
})
