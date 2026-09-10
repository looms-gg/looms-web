import { describe, expect, it } from "vitest"
import { parseSettingsTab, settingsTabQuery } from "./settingsTab"

describe("parseSettingsTab", () => {
  it("defaults to privacy", () => {
    expect(parseSettingsTab("")).toBe("privacy")
    expect(parseSettingsTab("?")).toBe("privacy")
    expect(parseSettingsTab("?tab=nonsense")).toBe("privacy")
  })

  it("parses each known tab", () => {
    expect(parseSettingsTab("?tab=profile")).toBe("profile")
    expect(parseSettingsTab("?tab=privacy")).toBe("privacy")
    expect(parseSettingsTab("?tab=uploads")).toBe("uploads")
    expect(parseSettingsTab("?tab=account")).toBe("account")
  })

  it("accepts a search string with or without the leading question mark", () => {
    expect(parseSettingsTab("tab=account")).toBe("account")
  })
})

describe("settingsTabQuery", () => {
  it("round-trips every tab", () => {
    for (const tab of ["profile", "privacy", "uploads", "account"] as const) {
      expect(parseSettingsTab(settingsTabQuery(tab))).toBe(tab)
    }
  })
})
