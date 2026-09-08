import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatErrorMessage } from "../lib/errorFormat"
import { MAX_LIMITS } from "../lib/sanitize"
import { supabase } from "../lib/supabase"
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
          data: expect.objectContaining({
            username: "BadName",
          }),
        }),
      }),
    )
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

    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
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
      },
      error: null,
    })
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle }),
          }),
          update,
        } as never
      }
      throw new Error(`unexpected table ${table}`)
    })
    vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never)

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
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        username: expect.stringMatching(new RegExp(`^.{1,${MAX_LIMITS.USERNAME}}$`)),
        bio: "b".repeat(MAX_LIMITS.BIO),
      }),
    )
    const payload = update.mock.calls[0][0] as { username: string; bio: string }
    expect(payload.username.length).toBeLessThanOrEqual(MAX_LIMITS.USERNAME)
    expect(payload.bio.length).toBe(MAX_LIMITS.BIO)
  })

  it("signInWithPassword surfaces formatted errors", async () => {
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
    expect(error?.message).toBe(formatErrorMessage(raw))
    expect(error?.message).toMatch(/Profile update rate limit|Rate limit reached/)
  })
})
