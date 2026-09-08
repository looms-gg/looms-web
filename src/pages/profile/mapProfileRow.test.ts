import { describe, expect, it } from "vitest"
import { mapProfileRow } from "./mapProfileRow"

const base = {
  id: "u1",
  username: "weaver",
  minecraft_username: null,
  bio: null,
  avatar_url: null,
  banner_url: null,
  show_last_seen: true,
  show_likes: true,
  username_changed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

describe("mapProfileRow", () => {
  it("pulls last_seen_at from a singular presence embed", () => {
    const row = mapProfileRow({
      ...base,
      profile_presence: { last_seen_at: "2026-09-07T12:00:00Z" },
    })
    expect(row.last_seen_at).toBe("2026-09-07T12:00:00Z")
  })

  it("nulls last_seen when presence is missing (privacy RLS)", () => {
    const row = mapProfileRow({ ...base, profile_presence: null })
    expect(row.last_seen_at).toBeNull()
  })
})
