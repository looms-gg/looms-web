import { describe, expect, it } from "vitest"
import {
  canChangeUsername,
  formatLastSeen,
  initialsFromUsername,
  nextUsernameChangeAt,
  resolveAvatarUrl,
  USERNAME_COOLDOWN_MS,
} from "./profileDisplay"

describe("resolveAvatarUrl", () => {
  it("prefers custom avatar over minecraft helm", () => {
    expect(
      resolveAvatarUrl({
        minecraft_username: "Steve",
        avatar_url: "https://cdn.example.com/a.png",
      }),
    ).toBe("https://cdn.example.com/a.png")
  })

  it("uses minotar when no custom avatar", () => {
    expect(resolveAvatarUrl({ minecraft_username: "Steve", avatar_url: null })).toBe(
      "https://minotar.net/helm/Steve/128.png",
    )
  })

  it("returns null for placeholder when neither set", () => {
    expect(resolveAvatarUrl({ minecraft_username: null, avatar_url: null })).toBeNull()
  })

  it("skips unsafe custom url and falls back to minotar", () => {
    expect(
      resolveAvatarUrl({
        minecraft_username: "Alex",
        avatar_url: "javascript:alert(1)",
      }),
    ).toBe("https://minotar.net/helm/Alex/128.png")
  })
})

describe("username cooldown", () => {
  it("allows change when never changed", () => {
    expect(canChangeUsername(null)).toBe(true)
  })

  it("blocks within 15 days", () => {
    const changed = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(canChangeUsername(changed)).toBe(false)
    expect(nextUsernameChangeAt(changed)!.getTime()).toBeGreaterThan(Date.now())
  })

  it("allows after cooldown", () => {
    const changed = new Date(Date.now() - USERNAME_COOLDOWN_MS - 1000).toISOString()
    expect(canChangeUsername(changed)).toBe(true)
  })
})

describe("formatLastSeen", () => {
  it("returns Active now within 5 minutes", () => {
    const t = new Date(Date.now() - 60_000).toISOString()
    expect(formatLastSeen(t)).toBe("Active now")
  })

  it("returns null when missing", () => {
    expect(formatLastSeen(null)).toBeNull()
  })
})

describe("initialsFromUsername", () => {
  it("uses first two alphanumeric chars", () => {
    expect(initialsFromUsername("ab")).toBe("AB")
    expect(initialsFromUsername("steve")).toBe("ST")
  })
})
