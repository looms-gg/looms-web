import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as authModule from "../../state/auth"
import type { AuthContextValue } from "../../state/auth"
import { RequireAuth } from "./RequireAuth"

function stubAuth(userId: string | null, loading = false): AuthContextValue {
  return {
    user: userId ? ({ id: userId, email: "test@looms.dev" } as AuthContextValue["user"]) : null,
    session: userId ? ({} as AuthContextValue["session"]) : null,
    profile: userId
      ? ({ id: userId, username: "Tester" } as AuthContextValue["profile"])
      : null,
    avatarUrl: null,
    loading,
    emailVerified: Boolean(userId),
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
    profileError: null,
    dismissProfileError: vi.fn(),
    deleteAccount: vi.fn(),
  }
}

function renderGate(ui: React.ReactNode, auth: AuthContextValue) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <authModule.AuthContext.Provider value={auth}>{ui}</authModule.AuthContext.Provider>,
    )
  })
  return host
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("RequireAuth", () => {
  it("shows gate copy and Sign in button when signed out, without opening auth yet", () => {
    const host = renderGate(
      <RequireAuth title="Sign in to use Studio" body="Create an account to style skins.">
        <div data-testid="secret">studio</div>
      </RequireAuth>,
      stubAuth(null),
    )

    expect(host.textContent).toMatch(/Sign in to use Studio/)
    expect(host.querySelector("[data-testid='secret']")).toBeNull()
    const button = host.querySelector("button")
    expect(button?.textContent).toMatch(/Sign in/)
    expect(document.body.textContent).not.toMatch(/password|email/i)
  })

  it("opens dismissible auth modal when Sign in is pressed", () => {
    const host = renderGate(
      <RequireAuth title="Sign in to use Studio" body="Create an account to style skins.">
        <div data-testid="secret">studio</div>
      </RequireAuth>,
      stubAuth(null),
    )

    const button = host.querySelector("button")
    expect(button).toBeTruthy()
    flushSync(() => {
      button!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(document.body.textContent).toMatch(/sign in|log in|password|email/i)
  })

  it("renders children when signed in", () => {
    const host = renderGate(
      <RequireAuth title="Sign in" body="Need account">
        <div data-testid="secret">studio</div>
      </RequireAuth>,
      stubAuth("u1"),
    )

    expect(host.querySelector("[data-testid='secret']")?.textContent).toBe("studio")
  })

  it("hides children while auth is loading", () => {
    const host = renderGate(
      <RequireAuth title="Sign in" body="Need account">
        <div data-testid="secret">studio</div>
      </RequireAuth>,
      stubAuth(null, true),
    )

    expect(host.querySelector("[data-testid='secret']")).toBeNull()
    expect(host.textContent).not.toMatch(/Sign in/)
  })
})
