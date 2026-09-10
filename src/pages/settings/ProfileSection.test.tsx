import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { ProfileRow } from "../../lib/supabase"
import * as authModule from "../../state/auth"
import type { AuthContextValue } from "../../state/auth"
import { ProfileSection } from "./ProfileSection"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

const baseProfile: ProfileRow = {
  id: "u1",
  username: "PixelWeaver",
  minecraft_username: null,
  bio: "Hello plaza",
  avatar_url: null,
  banner_url: null,
  last_seen_at: null,
  show_last_seen: true,
  show_likes: true,
  username_changed_at: null,
  created_at: "",
  updated_at: "",
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function renderSection(profile: ProfileRow = baseProfile) {
  const updateProfile = vi.fn(async () => ({ error: null }))
  vi.spyOn(authModule, "useAuth").mockReturnValue({
    user: { id: "u1" },
    profile,
    updateProfile,
  } as unknown as AuthContextValue)

  const host = document.createElement("div")
  document.body.appendChild(host)
  flushSync(() => {
    createRoot(host).render(
      <MemoryRouter>
        <ProfileSection />
      </MemoryRouter>,
    )
  })
  return { host, updateProfile }
}

describe("ProfileSection", () => {
  it("sends only changed fields in the update patch", async () => {
    const { host, updateProfile } = renderSection()

    const bio = host.querySelector('textarea[aria-label="Bio"]') as HTMLTextAreaElement
    setInputValue(bio, "New bio here")

    const save = Array.from(host.querySelectorAll("button")).find((b) =>
      /Save profile/.test(b.textContent ?? ""),
    ) as HTMLButtonElement
    await act(async () => {
      save.click()
      await Promise.resolve()
    })

    expect(updateProfile).toHaveBeenCalledTimes(1)
    expect(updateProfile).toHaveBeenCalledWith({ bio: "New bio here" })
  })

  it("reports nothing to save when nothing changed", async () => {
    const { host, updateProfile } = renderSection()

    const save = Array.from(host.querySelectorAll("button")).find((b) =>
      /Save profile/.test(b.textContent ?? ""),
    ) as HTMLButtonElement
    await act(async () => {
      save.click()
      await Promise.resolve()
    })

    expect(updateProfile).not.toHaveBeenCalled()
    expect(host.textContent).toMatch(/Nothing to save/)
  })

  it("formats server errors instead of leaking raw messages", async () => {
    const updateProfile = vi.fn(
      async () =>
        ({
          error: new Error("profile update rate limit exceeded"),
        }) as never,
    )
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: { id: "u1" },
      profile: baseProfile,
      updateProfile,
    } as unknown as AuthContextValue)

    const host = document.createElement("div")
    document.body.appendChild(host)
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <ProfileSection />
        </MemoryRouter>,
      )
    })

    const username = host.querySelector('input[aria-label="Username"]') as HTMLInputElement
    setInputValue(username, "NewName")

    const save = Array.from(host.querySelectorAll("button")).find((b) =>
      /Save profile/.test(b.textContent ?? ""),
    ) as HTMLButtonElement
    await act(async () => {
      save.click()
      await Promise.resolve()
    })

    expect(host.textContent).toMatch(/Profile update rate limit reached/i)
    expect(host.textContent).not.toContain("profile update rate limit exceeded")
  })

  it("locks the username field while the cooldown is active", () => {
    const locked: ProfileRow = {
      ...baseProfile,
      username_changed_at: new Date(Date.now() - 1000).toISOString(),
    }
    const { host } = renderSection(locked)

    const username = host.querySelector('input[aria-label="Username"]') as HTMLInputElement
    expect(username.disabled).toBe(true)
    expect(host.textContent).toMatch(/change your username again on/i)
  })

  it("clears the MC username by sending null", async () => {
    const withMc: ProfileRow = { ...baseProfile, minecraft_username: "Notch" }
    const { host, updateProfile } = renderSection(withMc)

    const mc = host.querySelector(
      'input[aria-label="Minecraft username"]',
    ) as HTMLInputElement
    setInputValue(mc, "")

    const save = Array.from(host.querySelectorAll("button")).find((b) =>
      /Save profile/.test(b.textContent ?? ""),
    ) as HTMLButtonElement
    await act(async () => {
      save.click()
      await Promise.resolve()
    })

    expect(updateProfile).toHaveBeenCalledWith({ minecraft_username: null })
  })
})
