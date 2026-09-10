import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { WardrobeProvider } from "../../state/wardrobe"
import { LikesProvider } from "../../state/likes"
import { ThemeProvider } from "../../state/theme"
import * as authModule from "../../state/auth"
import { Shell } from "./Shell"

function mockGuestAuth() {
  vi.spyOn(authModule, "useAuth").mockReturnValue({
    user: null,
    session: null,
    profile: null,
    avatarUrl: null,
    loading: false,
    profileError: null,
    dismissProfileError: vi.fn(),
    deleteAccount: vi.fn(),
    emailVerified: true,
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: vi.fn(),
    dismissEmailVerify: vi.fn(),
    resendConfirmation: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
  })
}

function renderWithProviders(ui: React.ReactNode, initialEntries: string[] = ["/"]) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <ThemeProvider>
        <LikesProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <WardrobeProvider>{ui}</WardrobeProvider>
          </MemoryRouter>
        </LikesProvider>
      </ThemeProvider>,
    )
  })
  return host
}

describe("Shell", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders browsable site with login and signup buttons when unauthenticated", () => {
    mockGuestAuth()

    const host = renderWithProviders(<Shell />)
    expect(host.querySelector('a[aria-label="looms home"]')).not.toBeNull()
    expect(host.textContent).toMatch(/Explore/i)
    expect(host.textContent).toMatch(/Wardrobe/i)
    expect(host.textContent).toMatch(/Studio/i)
    expect(host.textContent).toMatch(/Log in/i)
    expect(host.textContent).toMatch(/Sign up/i)
  })

  it("renders authenticated header and profile chip when logged in", () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: { id: "user-123", email: "weaver@example.com" } as any,
      session: {} as any,
      profile: {
        id: "user-123",
        username: "PixelWeaver",
        minecraft_username: "Steve",
        bio: null,
        avatar_url: null,
        banner_url: null,
        last_seen_at: null,
        show_last_seen: true,
        show_likes: true,
        username_changed_at: null,
        created_at: "",
        updated_at: "",
      },
      avatarUrl: "https://minotar.net/helm/Steve/128.png",
      loading: false,
      profileError: null,
      dismissProfileError: vi.fn(),
      deleteAccount: vi.fn(),
      emailVerified: true,
      pendingEmail: null,
      emailVerifyOpen: false,
      openEmailVerify: vi.fn(),
      dismissEmailVerify: vi.fn(),
      resendConfirmation: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
      refreshProfile: vi.fn(),
    })

    const host = renderWithProviders(<Shell />)
    expect(host.textContent).toMatch(/PixelWeaver/)
    expect(host.textContent).toMatch(/Explore/)
    expect(host.textContent).toMatch(/Wardrobe/)
    expect(host.textContent).toMatch(/Studio/)
    expect(host.querySelector('a[href="/u/PixelWeaver"]')).not.toBeNull()
  })

  it("shows a confirm-email chip when the session is pending verification", () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: { id: "user-123", email: "weaver@example.com", email_confirmed_at: null } as any,
      session: {} as any,
      profile: {
        id: "user-123",
        username: "PixelWeaver",
        minecraft_username: "Steve",
        bio: null,
        avatar_url: null,
        banner_url: null,
        last_seen_at: null,
        show_last_seen: true,
        show_likes: true,
        username_changed_at: null,
        created_at: "",
        updated_at: "",
      },
      avatarUrl: "https://minotar.net/helm/Steve/128.png",
      loading: false,
      profileError: null,
      dismissProfileError: vi.fn(),
      deleteAccount: vi.fn(),
      emailVerified: false,
      pendingEmail: "weaver@example.com",
      emailVerifyOpen: false,
      openEmailVerify: vi.fn(),
      dismissEmailVerify: vi.fn(),
      resendConfirmation: vi.fn(),
      signInWithPassword: vi.fn(),
      signUpWithPassword: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
      refreshProfile: vi.fn(),
    })

    const host = renderWithProviders(<Shell />)
    expect(host.textContent).toMatch(/Confirm email/)
  })

  it("renders footer with Discord off studio routes", () => {
    mockGuestAuth()
    const host = renderWithProviders(<Shell />)
    expect(host.querySelector('a[href="https://discord.gg/UNTRgHBBPb"]')).not.toBeNull()
    expect(host.querySelector("footer")).not.toBeNull()
  })

  it("hides footer on studio but still shows cookie banner when unset", () => {
    mockGuestAuth()
    const host = renderWithProviders(<Shell />, ["/studio"])
    expect(host.querySelector("footer")).toBeNull()
    expect(host.querySelector('[aria-label="Cookie consent"]')).not.toBeNull()
  })
})
