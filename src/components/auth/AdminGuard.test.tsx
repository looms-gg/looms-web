import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import * as authModule from "../../state/auth"
import type { AuthContextValue } from "../../state/auth"
import { AdminGuard } from "./AdminGuard"

function stubAuth(userId: string | null, loading = false): AuthContextValue {
  return {
    user: userId ? ({ id: userId, email: "admin@looms.dev" } as AuthContextValue["user"]) : null,
    session: userId ? ({} as AuthContextValue["session"]) : null,
    profile: userId
      ? ({ id: userId, username: "Admin" } as AuthContextValue["profile"])
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
    resetPasswordForEmail: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
    profileError: null,
    dismissProfileError: vi.fn(),
    deleteAccount: vi.fn(),
  }
}

function renderGuard(ui: React.ReactNode, auth: AuthContextValue) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <MemoryRouter>
        <authModule.AuthContext.Provider value={auth}>{ui}</authModule.AuthContext.Provider>
      </MemoryRouter>,
    )
  })
  return host
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("AdminGuard", () => {
  it("renders children when authenticated as the designated admin", () => {
    const host = renderGuard(
      <AdminGuard>
        <div data-testid="admin-content">Admin Dashboard Content</div>
      </AdminGuard>,
      stubAuth("45e6be54-c9a5-4627-af39-9c14b27ec92e"),
    )

    expect(host.querySelector("[data-testid='admin-content']")).not.toBeNull()
    expect(host.textContent).toMatch(/Admin Dashboard Content/)
  })

  it("blocks and shows access restricted for non-admin user", () => {
    const host = renderGuard(
      <AdminGuard>
        <div data-testid="admin-content">Admin Dashboard Content</div>
      </AdminGuard>,
      stubAuth("normal-user-1234"),
    )

    expect(host.querySelector("[data-testid='admin-content']")).toBeNull()
    expect(host.textContent).toMatch(/Access Restricted/i)
    expect(host.textContent).toMatch(/restricted to verified platform administrators/i)
  })

  it("blocks and shows access restricted when not logged in", () => {
    const host = renderGuard(
      <AdminGuard>
        <div data-testid="admin-content">Admin Dashboard Content</div>
      </AdminGuard>,
      stubAuth(null),
    )

    expect(host.querySelector("[data-testid='admin-content']")).toBeNull()
    expect(host.textContent).toMatch(/Access Restricted/i)
  })

  it("shows loading spinner when auth is loading", () => {
    const host = renderGuard(
      <AdminGuard>
        <div data-testid="admin-content">Admin Dashboard Content</div>
      </AdminGuard>,
      stubAuth(null, true),
    )

    expect(host.querySelector(".loading-spinner")).not.toBeNull()
  })
})
