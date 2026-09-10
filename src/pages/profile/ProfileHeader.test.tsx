import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { ProfileRow } from "../../lib/supabase"
import * as authModule from "../../state/auth"
import { ProfileHeader } from "./ProfileHeader"

const baseProfile: ProfileRow = {
  id: "u1",
  username: "PixelWeaver",
  minecraft_username: null,
  bio: "Hello plaza",
  avatar_url: null,
  banner_url: null,
  last_seen_at: new Date().toISOString(),
  show_last_seen: true,
  show_likes: true,
  username_changed_at: null,
  created_at: "",
  updated_at: "",
}

function renderHeader(isOwner: boolean) {
  vi.spyOn(authModule, "useAuth").mockReturnValue({
    user: isOwner ? { id: "u1" } : null,
  } as any)

  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <MemoryRouter>
        <ProfileHeader profile={baseProfile} isOwner={isOwner} />
      </MemoryRouter>,
    )
  })
  return host
}

describe("ProfileHeader", () => {
  it("is display-only: no inline edit inputs for the owner", () => {
    const host = renderHeader(true)
    expect(host.querySelector("input")).toBeNull()
    expect(host.querySelector("textarea")).toBeNull()
  })

  it("shows an edit-profile settings link only for the owner", () => {
    const owner = renderHeader(true)
    const editLink = owner.querySelector('a[aria-label="Edit profile"]')
    expect(editLink).not.toBeNull()
    expect(editLink?.getAttribute("href")).toContain("/settings")

    const visitor = renderHeader(false)
    expect(visitor.querySelector('a[aria-label="Edit profile"]')).toBeNull()
  })

  it("shows bio text and username for visitors without owner chrome", () => {
    const host = renderHeader(false)
    expect(host.textContent).toContain("Hello plaza")
    expect(host.textContent).toContain("PixelWeaver")
    expect(host.querySelector('button[aria-label="Change banner"]')).toBeNull()
    expect(host.querySelector('button[aria-label="Change profile picture"]')).toBeNull()
  })
})
