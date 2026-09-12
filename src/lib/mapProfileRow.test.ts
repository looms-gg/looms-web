import { afterEach, describe, expect, it, vi } from "vitest"
import { mapProfileRow, fetchProfileRow, type ProfileRowData } from "./mapProfileRow"
import { supabase } from "./supabase"

const base = {
  id: "u1",
  username: "weaver",
  minecraft_username: null,
  bio: null,
  avatar_url: null,
  banner_url: null,
  show_last_seen: true,
  show_likes: true,
  notify_likes: true,
  notify_comments: true,
  notify_replies: true,
  username_changed_at: null,
  onboarding_complete: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function stubFrom(responses: { data: unknown; error: unknown }[]) {
  let call = 0
  vi.spyOn(supabase, "from").mockImplementation(() => {
    const res = responses[call++] ?? { data: null, error: null }
    const builder: Record<string, unknown> = {}
    const chain = () => builder
    builder.select = chain
    builder.eq = chain
    builder.maybeSingle = () => Promise.resolve(res)
    return builder as never
  })
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

  it("maps onboarding_complete onto ProfileRow", () => {
    const row = mapProfileRow({ ...base, onboarding_complete: false })
    expect(row.onboarding_complete).toBe(false)
  })

  it("fills DB defaults for columns missing pre-migration", () => {
    const row = mapProfileRow({
      id: "u1",
      username: "weaver",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as ProfileRowData)
    expect(row.minecraft_username).toBeNull()
    expect(row.bio).toBeNull()
    expect(row.avatar_url).toBeNull()
    expect(row.banner_url).toBeNull()
    expect(row.show_last_seen).toBe(true)
    expect(row.show_likes).toBe(true)
    expect(row.notify_likes).toBe(true)
    expect(row.notify_comments).toBe(true)
    expect(row.notify_replies).toBe(true)
    expect(row.username_changed_at).toBeNull()
    expect(row.onboarding_complete).toBe(false)
    expect(row.last_seen_at).toBeNull()
  })
})

describe("fetchProfileRow", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns the embedded row on the first try", async () => {
    const full = { ...base, profile_presence: { last_seen_at: null } }
    stubFrom([{ data: full, error: null }])
    const { data, error } = await fetchProfileRow("id", "u1")
    expect(error).toBeNull()
    expect(data).toEqual(full)
  })

  it("falls back to a plain row when the embed fails (missing table)", async () => {
    const plain = { ...base }
    stubFrom([
      { data: null, error: { message: "relation profiles.profile_presence does not exist" } },
      { data: plain, error: null },
    ])
    const { data, error } = await fetchProfileRow("username", "weaver")
    expect(error).toBeNull()
    expect(data).toEqual(plain)
  })

  it("returns the error when both attempts fail", async () => {
    stubFrom([
      { data: null, error: { message: "column profiles.onboarding_complete does not exist" } },
      { data: null, error: { message: "network down" } },
    ])
    const { data, error } = await fetchProfileRow("id", "u1")
    expect(data).toBeNull()
    expect(error?.message).toBe("network down")
  })
})
