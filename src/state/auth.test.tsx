import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MAX_LIMITS } from "../lib/sanitize"
import { supabase } from "../lib/supabase"
import { absoluteAppUrl } from "../lib/basePath"
import { mockSupabaseFrom, mockSupabaseRpc } from "../test/supabaseMock"
import { AuthProvider, useAuth } from "./auth"

function mountAuth() {
  let authVal!: ReturnType<typeof useAuth>
  function HookCatcher() {
    authVal = useAuth()
    return null
  }
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <HookCatcher />
      </AuthProvider>,
    )
  })
  return { getAuth: () => authVal, host }
}

describe("auth module", () => {
  beforeEach(() => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as never)
    vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("exports provider and hook", () => {
    expect(typeof AuthProvider).toBe("function")
    expect(typeof useAuth).toBe("function")
  })

  it("renders inside AuthProvider with initial loading state", () => {
    const { getAuth } = mountAuth()
    expect(getAuth().loading).toBe(true)
    expect(getAuth().user).toBeNull()
  })

  it("signUpWithPassword sanitizes username before signUp", async () => {
    const signUp = vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never)
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never)

    const { getAuth } = mountAuth()
    await getAuth().signUpWithPassword({
      email: "user@example.com",
      password: "password123",
      username: "Bad Name!!!@@@",
    })

    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          // Must include the Vite base path so email confirmation redirects
          // back to the deployed app, not the bare origin (bug report).
          emailRedirectTo: absoluteAppUrl(),
          data: expect.objectContaining({
            username: "BadName",
          }),
        }),
      }),
    )
  })

  it("resendConfirmation redirects to the app URL including base path", async () => {
    const resend = vi.spyOn(supabase.auth, "resend").mockResolvedValue({
      data: null,
      error: null,
    } as never)

    const { getAuth } = mountAuth()
    // An unconfirmed user hitting login is what sets pendingEmail in the app.
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Email not confirmed" },
    } as never)
    await getAuth().signInWithPassword({ email: "user@example.com", password: "pw123456" })
    await vi.waitFor(() => expect(getAuth().pendingEmail).toBe("user@example.com"))

    await getAuth().resendConfirmation()

    expect(resend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "signup",
        options: expect.objectContaining({
          emailRedirectTo: absoluteAppUrl(),
        }),
      }),
    )
  })

  it("resetPasswordForEmail redirects to the reset page with base path", async () => {
    const reset = vi.spyOn(supabase.auth, "resetPasswordForEmail").mockResolvedValue({
      data: null,
      error: null,
    } as never)

    const { getAuth } = mountAuth()
    const { error } = await getAuth().resetPasswordForEmail({
      email: "user@example.com",
    })

    expect(error).toBeNull()
    expect(reset).toHaveBeenCalledWith(
      "user@example.com",
      expect.objectContaining({
        redirectTo: `${absoluteAppUrl()}/reset-password`,
      }),
    )
  })

  it("resetPasswordForEmail surfaces formatted errors", async () => {
    vi.spyOn(supabase.auth, "resetPasswordForEmail").mockResolvedValue({
      data: null,
      error: { message: "Email rate limit exceeded" },
    } as never)

    const { getAuth } = mountAuth()
    const { error } = await getAuth().resetPasswordForEmail({
      email: "user@example.com",
    })

    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toContain("rate limit")
  })

  it("updateProfile truncates over-limit fields via sanitize", async () => {
    const user = {
      id: "user-1",
      email: "user@example.com",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00Z",
    }
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: {
          user,
          access_token: "tok",
          refresh_token: "ref",
          expires_in: 3600,
          token_type: "bearer",
        },
      },
      error: null,
    } as never)

    const profileRow = {
      id: user.id,
      username: "ok",
      minecraft_username: null,
      bio: null,
      banner_url: null,
      avatar_url: null,
      show_last_seen: true,
      show_likes: true,
      created_at: "2026-01-01T00:00:00Z",
      last_seen_at: null,
    }
    const from = mockSupabaseFrom()
    from.setDefaultHandler((query) => {
      throw new Error(`unexpected table ${query.table}`)
    })
    from.on("profiles", (query) => {
      if (query.operation === "update") {
        return { data: null, error: null }
      }
      return { data: profileRow, error: null }
    })
    from.on("admin_users", { data: null, error: null })
    mockSupabaseRpc()
    const { getAuth } = mountAuth()
    // Allow session resolve + profile fetch to settle
    await Promise.resolve()
    await Promise.resolve()
    await vi.waitFor(() => {
      expect(getAuth().loading).toBe(false)
      expect(getAuth().user?.id).toBe(user.id)
    })

    const longUser = `user_${"x".repeat(80)}`
    const longBio = "b".repeat(MAX_LIMITS.BIO + 40)
    const { error } = await getAuth().updateProfile({
      username: longUser,
      bio: longBio,
    })
    expect(error).toBeNull()
    const updates = from.getQueries("profiles", "update")
    expect(updates).toHaveLength(1)
    const payload = (updates[0].payload as { values: { username: string; bio: string } }).values
    expect(payload).toEqual(
      expect.objectContaining({
        username: expect.stringMatching(new RegExp(`^.{1,${MAX_LIMITS.USERNAME}}$`)),
        bio: "b".repeat(MAX_LIMITS.BIO),
      }),
    )
    expect(payload.username.length).toBeLessThanOrEqual(MAX_LIMITS.USERNAME)
    expect(payload.bio.length).toBe(MAX_LIMITS.BIO)
  })

  it("signInWithPassword passes the raw server message through", async () => {
    const raw = { message: "Rate limit exceeded for this profile" }
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { user: null, session: null },
      error: raw,
    } as never)

    const { getAuth } = mountAuth()
    const { error } = await getAuth().signInWithPassword({
      email: "user@example.com",
      password: "bad",
    })
    expect(error).toBeInstanceOf(Error)
    expect(error?.message).toBe(raw.message)
  })

  it("signUpWithPassword succeeds without a doomed sign-in retry for unconfirmed users", async () => {
    const signUp = vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: {
        user: { id: "user-2", email: "user@example.com", email_confirmed_at: null } as never,
        session: null,
      },
      error: null,
    } as never)
    const signIn = vi
      .spyOn(supabase.auth, "signInWithPassword")
      .mockRejectedValue(new Error("must not be called"))
    const from = mockSupabaseFrom()
    from.setDefaultHandler((query) => {
      throw new Error(`unexpected table ${query.table}`)
    })
    from.on("profiles", { data: null, error: null })
    from.on("admin_users", { data: null, error: null })

    const { getAuth } = mountAuth()
    const { error } = await getAuth().signUpWithPassword({
      email: "user@example.com",
      password: "password123",
      username: "Thomakosxd",
    })

    expect(error).toBeNull()
    expect(signUp).toHaveBeenCalledTimes(1)
    expect(signIn).not.toHaveBeenCalled()
  })

  it("signUpWithPassword passes the raw signup API error through", async () => {
    vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Request rate limit reached" } as never,
    } as never)

    const { getAuth } = mountAuth()
    const { error } = await getAuth().signUpWithPassword({
      email: "user@example.com",
      password: "password123",
      username: "Thomakosxd",
    })

    expect(error?.message).toBe("Request rate limit reached")
  })

  it("deleteAccount calls the RPC, signs out, and clears local state", async () => {
    const rpc = mockSupabaseRpc()
    const signOut = vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null } as never)

    const { getAuth } = mountAuth()
    const { error } = await getAuth().deleteAccount()

    expect(error).toBeNull()
    expect(rpc.rpcSpy).toHaveBeenCalledWith("delete_my_account")
    expect(signOut).toHaveBeenCalled()
    expect(getAuth().user).toBeNull()
    expect(getAuth().profile).toBeNull()
  })

  it("deleteAccount surfaces RPC errors but still signs out", async () => {
    mockSupabaseRpc().setDefaultHandler({
      data: null,
      error: { message: "delete_my_account: not authenticated" },
    })
    vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null } as never)

    const { getAuth } = mountAuth()
    const { error } = await getAuth().deleteAccount()

    expect(error?.message).toMatch(/not authenticated/i)
    expect(getAuth().user).toBeNull()
  })

  it("signInWithOAuth redirects to the callback route with the app base path", async () => {
    const signInWithOAuth = vi.spyOn(supabase.auth, "signInWithOAuth").mockResolvedValue({
      data: { provider: "discord", url: "https://example.com" },
      error: null,
    } as never)
    const { getAuth } = mountAuth()
    await getAuth().signInWithOAuth("discord")
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "discord",
      options: { redirectTo: `${absoluteAppUrl()}/auth/callback` },
    })
  })

  it("completeOnboarding calls the RPC with a sanitized username", async () => {
    const rpc = mockSupabaseRpc()
    const { getAuth } = mountAuth()
    const { error } = await getAuth().completeOnboarding("  Pixel<script>Weaver  ")
    expect(rpc.rpcSpy).toHaveBeenCalledWith("complete_onboarding", { p_username: "PixelWeaver" })
    expect(error).toBeNull()
  })

  it("signUpWithPassword no longer sends minecraft_username", async () => {
    const signUp = vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never)
    const { getAuth } = mountAuth()
    await getAuth().signUpWithPassword({
      email: "a@b.c",
      password: "hunter22",
      username: "PixelWeaver",
    })
    const call = signUp.mock.calls[0][0] as { options?: { data?: Record<string, unknown> } }
    expect(call.options?.data).toEqual({ username: "PixelWeaver" })
  })
})
