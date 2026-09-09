import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "../../state/auth"
import { VerifyEmailModal } from "./VerifyEmailModal"

const roots: { root: Root; host: HTMLElement }[] = []

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: {
      id: "u1",
      email: "weaver@looms.dev",
      email_confirmed_at: null,
    } as unknown as AuthContextValue["user"],
    session: {} as AuthContextValue["session"],
    profile: { id: "u1", username: "PixelWeaver" } as AuthContextValue["profile"],
    avatarUrl: null,
    loading: false,
    profileError: null,
    dismissProfileError: vi.fn(),
    deleteAccount: vi.fn(),
    emailVerified: false,
    pendingEmail: "weaver@looms.dev",
    emailVerifyOpen: true,
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
    resendConfirmation: vi.fn().mockResolvedValue({ error: null }),
    openEmailVerify: vi.fn(),
    dismissEmailVerify: vi.fn(),
    ...overrides,
  }
}

function renderModal(value: AuthContextValue) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <AuthContext.Provider value={value}>
        <VerifyEmailModal />
      </AuthContext.Provider>,
    )
  })
  roots.push({ root, host })
  return document.body
}

afterEach(() => {
  for (const { root, host } of roots.splice(0)) {
    flushSync(() => {
      root.unmount()
    })
    host.remove()
  }
})

describe("VerifyEmailModal", () => {
  it("shows the pending inbox address and listening status", () => {
    const body = renderModal(authValue())
    expect(body.querySelector(".auth-scrim")).not.toBeNull()
    expect(body.textContent).toMatch(/weaver@looms\.dev/)
    expect(body.textContent).toMatch(/Listening/i)
    expect(body.textContent).toMatch(/Send another link/i)
  })

  it("flashes a confirmed state when the email is verified", () => {
    const body = renderModal(
      authValue({
        emailVerified: true,
        emailVerifyOpen: true,
        user: {
          id: "u1",
          email: "weaver@looms.dev",
          email_confirmed_at: "2026-09-07T00:00:00Z",
        } as AuthContextValue["user"],
      }),
    )
    expect(body.textContent).toMatch(/You're in/i)
  })

  it("renders nothing when verification is not needed", () => {
    const body = renderModal(
      authValue({
        emailVerified: true,
        emailVerifyOpen: false,
        pendingEmail: null,
        user: {
          id: "u1",
          email: "weaver@looms.dev",
          email_confirmed_at: "2026-09-07T00:00:00Z",
        } as AuthContextValue["user"],
      }),
    )
    expect(body.querySelector(".auth-scrim")).toBeNull()
  })
})
