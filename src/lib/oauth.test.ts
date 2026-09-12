import { afterEach, describe, expect, it } from "vitest"
import {
  OAUTH_RETURN_KEY,
  isOAuthProvider,
  pickOAuthUsername,
  providerLabel,
  stashOAuthReturn,
  takeOAuthReturn,
} from "./oauth"

describe("oauth helpers", () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it("knows the three providers", () => {
    expect(isOAuthProvider("discord")).toBe(true)
    expect(isOAuthProvider("google")).toBe(true)
    expect(isOAuthProvider("azure")).toBe(true)
    expect(isOAuthProvider("email")).toBe(false)
    expect(isOAuthProvider("github")).toBe(false)
  })

  it("labels providers in platform voice", () => {
    expect(providerLabel("discord")).toBe("Discord")
    expect(providerLabel("google")).toBe("Google")
    expect(providerLabel("azure")).toBe("Microsoft")
  })

  it("picks a Discord username from metadata", () => {
    expect(
      pickOAuthUsername({
        app_metadata: { provider: "discord" },
        user_metadata: { global_name: "Pixel Weaver!", user_name: "pixelweaver" },
      }),
    ).toBe("PixelWeaver")
  })

  it("falls back through the metadata chain", () => {
    expect(
      pickOAuthUsername({
        app_metadata: { provider: "google" },
        user_metadata: { name: "Sam <b>Lee</b>" },
      }),
    ).toBe("SamLee")
    expect(
      pickOAuthUsername({
        app_metadata: { provider: "azure" },
        user_metadata: { preferred_username: "sam@outlook.com" },
      }),
    ).toBe("samoutlookcom")
  })

  it("returns empty when nothing usable exists", () => {
    expect(pickOAuthUsername({ app_metadata: null, user_metadata: null })).toBe("")
    expect(pickOAuthUsername(null)).toBe("")
  })

  it("stashes and takes the return path", () => {
    stashOAuthReturn("/studio", "?tab=brush")
    expect(takeOAuthReturn()).toBe("/studio?tab=brush")
    expect(takeOAuthReturn()).toBe("/")
  })

  it("rejects off-site return paths", () => {
    window.localStorage.setItem(OAUTH_RETURN_KEY, "https://evil.example.com")
    expect(takeOAuthReturn()).toBe("/")
    window.localStorage.setItem(OAUTH_RETURN_KEY, "//evil.example.com")
    expect(takeOAuthReturn()).toBe("/")
  })
})
