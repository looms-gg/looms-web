import { act, type RefObject } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { useEmailVerificationPoll } from "./emailVerificationPoll"

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "user@example.com",
    email_confirmed_at: null,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as User
}

const roots: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = []

type PollOptions = {
  user: User | null
  session?: unknown
  pendingEmail?: string | null
  pendingUnlock?: { email: string; password: string } | null
}

function mountPoll(options: PollOptions) {
  const pendingUnlockRef: RefObject<{ email: string; password: string } | null> = {
    current: options.pendingUnlock ?? null,
  }
  const unlockAttemptAtRef: RefObject<number> = { current: 0 }
  const onUser = vi.fn()
  const host = document.createElement("div")
  function HookCatcher() {
    useEmailVerificationPoll({
      user: options.user,
      session: options.session ?? null,
      pendingEmail: options.pendingEmail ?? null,
      pendingUnlockRef,
      unlockAttemptAtRef,
      onUser,
    })
    return null
  }
  const root = createRoot(host)
  roots.push({ root, host })
  act(() => {
    flushSync(() => {
      root.render(<HookCatcher />)
    })
  })
  return { onUser, pendingUnlockRef, unmount: () => act(() => root.unmount()) }
}

async function advanceTimers(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const unconfirmedUser = makeUser()
const confirmedUser = makeUser({ email_confirmed_at: "2026-01-02T00:00:00Z" })

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: null },
    error: null,
  } as never)
  vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  } as never)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  for (const { root, host } of roots.splice(0)) {
    act(() => {
      root.unmount()
    })
    host.remove()
  }
  document.body.innerHTML = ""
})

describe("useEmailVerificationPoll", () => {
  it("does not poll when the user is already verified and nothing is pending", async () => {
    mountPoll({ user: confirmedUser })

    await advanceTimers(120_000)

    expect(vi.mocked(supabase.auth.getUser)).not.toHaveBeenCalled()
    expect(vi.mocked(supabase.auth.signInWithPassword)).not.toHaveBeenCalled()
  })

  it("does not poll when there is no user and no pending unlock", async () => {
    mountPoll({ user: null, pendingEmail: "user@example.com" })

    await advanceTimers(120_000)

    expect(vi.mocked(supabase.auth.getUser)).not.toHaveBeenCalled()
  })

  it("polls /auth/v1/user on a doubling backoff capped at 30s", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: unconfirmedUser },
      error: null,
    } as never)
    mountPoll({ user: unconfirmedUser })

    await advanceTimers(5_000)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(1)

    await advanceTimers(10_000)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(2)

    await advanceTimers(20_000)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(3)

    await advanceTimers(30_000)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(4)

    await advanceTimers(30_000)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(5)
  })

  it("avoids state churn when the server returns the same unconfirmed user", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: unconfirmedUser },
      error: null,
    } as never)
    const { onUser } = mountPoll({ user: unconfirmedUser })

    await advanceTimers(65_000)

    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(4)
    expect(onUser).not.toHaveBeenCalled()
  })

  it("reports a newly confirmed user through onUser", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: confirmedUser },
      error: null,
    } as never)
    const { onUser } = mountPoll({ user: unconfirmedUser })

    await advanceTimers(5_000)

    expect(onUser).toHaveBeenCalledWith(confirmedUser)
  })

  it("stops fetching after unmount and drops its visibility listener", async () => {
    const poll = mountPoll({ user: unconfirmedUser })
    poll.unmount()

    await advanceTimers(120_000)
    expect(vi.mocked(supabase.auth.getUser)).not.toHaveBeenCalled()

    document.dispatchEvent(new Event("visibilitychange"))
    await advanceTimers(5_000)
    expect(vi.mocked(supabase.auth.getUser)).not.toHaveBeenCalled()
  })

  it("unlocks the session with stashed credentials and clears the stash on success", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never)
    const unlock = { email: "user@example.com", password: "pw123456" }
    const { pendingUnlockRef } = mountPoll({
      user: null,
      session: null,
      pendingEmail: "user@example.com",
      pendingUnlock: unlock,
    })

    await advanceTimers(5_000)

    expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledWith(unlock)
    expect(pendingUnlockRef.current).toBeNull()
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(1)
  })

  it("keeps the stash and retries the unlock on the 30s spacing while unconfirmed", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as never)
    const signIn = vi.mocked(supabase.auth.signInWithPassword)
    signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Email not confirmed" },
    } as never)
    const { pendingUnlockRef } = mountPoll({
      user: null,
      session: null,
      pendingEmail: "user@example.com",
      pendingUnlock: { email: "user@example.com", password: "pw123456" },
    })

    await advanceTimers(5_000)
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(1)

    // 10s later: still inside the 30s unlock spacing, only the user poll runs.
    await advanceTimers(10_000)
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(2)

    // 30s after the first attempt the unlock is retried.
    await advanceTimers(20_000)
    expect(signIn).toHaveBeenCalledTimes(2)
    expect(vi.mocked(supabase.auth.getUser)).toHaveBeenCalledTimes(3)
    expect(pendingUnlockRef.current).not.toBeNull()
  })

  it("skips the user fetch when the unlock fails for a reason other than unconfirmed", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    } as never)
    mountPoll({
      user: null,
      session: null,
      pendingEmail: "user@example.com",
      pendingUnlock: { email: "user@example.com", password: "pw123456" },
    })

    await advanceTimers(5_000)

    expect(vi.mocked(supabase.auth.signInWithPassword)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(supabase.auth.getUser)).not.toHaveBeenCalled()
  })
})
