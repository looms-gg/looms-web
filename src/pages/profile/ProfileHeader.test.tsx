import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import type { ProfileRow } from "../../lib/supabase"
import { AuthProvider } from "../../state/auth"
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
    updateProfile: vi.fn(async () => ({ error: null })),
  } as any)

  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <ProfileHeader profile={baseProfile} isOwner={isOwner} onSaved={() => {}} />
      </AuthProvider>,
    )
  })
  return host
}

describe("ProfileHeader", () => {
  it("shows privacy settings cog only for the owner", () => {
    const owner = renderHeader(true)
    const cog = owner.querySelector('button[aria-label="Privacy settings"]') as HTMLButtonElement
    expect(cog).not.toBeNull()
    expect(owner.querySelector('button[aria-label="Change banner"]')).not.toBeNull()
    expect(owner.querySelector('button[aria-label="Change profile picture"]')).not.toBeNull()

    flushSync(() => {
      cog.click()
    })
    expect(owner.textContent).toMatch(/Last seen/i)
    expect(owner.textContent).toMatch(/Show likes/i)

    const visitor = renderHeader(false)
    expect(visitor.querySelector('button[aria-label="Privacy settings"]')).toBeNull()
    expect(visitor.querySelector('button[aria-label="Change banner"]')).toBeNull()
  })

  it("hides owner upload icons until hover", () => {
    const host = renderHeader(true)
    const banner = host.querySelector('button[aria-label="Change banner"]') as HTMLButtonElement
    const avatar = host.querySelector(
      'button[aria-label="Change profile picture"]',
    ) as HTMLButtonElement
    const bannerIcon = banner.querySelector(".absolute.inset-0.grid") as HTMLElement
    const avatarIcon = avatar.querySelector(".absolute.inset-0.grid") as HTMLElement
    expect(bannerIcon.className).toContain("opacity-0")
    expect(bannerIcon.className).toContain("group-hover/banner:opacity-100")
    expect(avatarIcon.className).toContain("opacity-0")
    expect(avatarIcon.className).toContain("group-hover/avatar:opacity-100")
  })

  it("shows bio text for visitors", () => {
    const host = renderHeader(false)
    expect(host.textContent).toContain("Hello plaza")
    expect(host.textContent).toContain("PixelWeaver")
  })
})
