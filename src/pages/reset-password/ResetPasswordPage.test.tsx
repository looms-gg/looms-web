import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ResetPasswordPage } from "./ResetPasswordPage"
import * as authModule from "../../state/auth"
import { supabase } from "../../lib/supabase"

let root: ReturnType<typeof createRoot> | null = null
let host: HTMLDivElement | null = null

function mountPage() {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  flushSync(() => {
    root!.render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>,
    )
  })
  return host
}

function mockAuth(partial: Partial<authModule.AuthContextValue>) {
  return vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
    user: null,
    session: null,
    profile: null,
    avatarUrl: null,
    isAdmin: false,
    loading: false,
    profileError: null,
    dismissProfileError: vi.fn(),
    emailVerified: false,
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: vi.fn(),
    closeEmailVerify: vi.fn(),
    resendEmailVerification: vi.fn(),
    checkEmailVerification: vi.fn(),
    loginWithDiscord: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithPassword: vi.fn(),
    signupWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    updateProfile: vi.fn(),
    ...partial,
  } as unknown as authModule.AuthContextValue)
}

describe("ResetPasswordPage", () => {
  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount()
      })
      root = null
    }
    if (host) {
      host.remove()
      host = null
    }
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("shows loading spinner when waiting for session", () => {
    mockAuth({ loading: true })

    const dom = mountPage()
    expect(dom.querySelector(".loading-spinner")).not.toBeNull()
  })

  it("shows expired link after timeout when no session exists", async () => {
    vi.useFakeTimers()
    mockAuth({ loading: false })

    const dom = mountPage()
    act(() => {
      vi.advanceTimersByTime(3100)
    })
    flushSync(() => {})

    expect(dom.textContent).toContain("Reset link expired")
  })

  it("shows password form when session exists", () => {
    mockAuth({
      user: { id: "u1" } as never,
      session: { user: { id: "u1" } } as never,
    })

    const dom = mountPage()
    expect(dom.textContent).toContain("Choose a new password")
    expect(dom.querySelector("input[name='password']")).not.toBeNull()
    expect(dom.querySelector("input[name='confirmPassword']")).not.toBeNull()
  })

  it("shows error when passwords do not match", async () => {
    mockAuth({
      user: { id: "u1" } as never,
      session: { user: { id: "u1" } } as never,
    })

    const dom = mountPage()
    const form = dom.querySelector("form")!
    const pw = dom.querySelector("input[name='password']") as HTMLInputElement
    const cpw = dom.querySelector("input[name='confirmPassword']") as HTMLInputElement
    pw.value = "secret123"
    cpw.value = "different123"

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })
    flushSync(() => {})

    expect(dom.textContent).toContain("Passwords do not match.")
  })

  it("updates password and shows done state on success", async () => {
    mockAuth({
      user: { id: "u1" } as never,
      session: { user: { id: "u1" } } as never,
    })

    vi.spyOn(supabase.auth, "updateUser").mockResolvedValue({
      data: { user: { id: "u1" } as never },
      error: null,
    })
    vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null })

    const dom = mountPage()
    const form = dom.querySelector("form")!
    const pw = dom.querySelector("input[name='password']") as HTMLInputElement
    const cpw = dom.querySelector("input[name='confirmPassword']") as HTMLInputElement
    pw.value = "secret123"
    cpw.value = "secret123"

    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })
    flushSync(() => {})

    expect(dom.textContent).toContain("Password updated")
  })
})

