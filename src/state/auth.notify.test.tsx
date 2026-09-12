import { describe, expect, it } from "vitest"
import { mapProfileRow } from "../lib/mapProfileRow"

describe("mapProfileRow notify columns", () => {
  it("carries the notify toggles through", () => {
    const mapped = mapProfileRow({
      id: "u1",
      username: "Tester",
      minecraft_username: null,
      bio: null,
      avatar_url: null,
      banner_url: null,
      show_last_seen: true,
      show_likes: true,
      notify_likes: false,
      notify_comments: true,
      notify_replies: true,
      username_changed_at: null,
      onboarding_complete: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    })
    expect(mapped.notify_likes).toBe(false)
    expect(mapped.notify_comments).toBe(true)
    expect(mapped.notify_replies).toBe(true)
  })
})
