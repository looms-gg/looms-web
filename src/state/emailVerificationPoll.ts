import { useEffect, type RefObject } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"
import { isEmailVerified, isUnconfirmedAuthError } from "../lib/emailStatus"
import { startBackoffPoll } from "../lib/backoffPoll"

/** Minimum spacing between background sign-in attempts while waiting for email confirmation. */
const UNLOCK_RETRY_INTERVAL_MS = 30 * 1000

/** Verification poll cadence: starts here and doubles up to the max. */
const UNLOCK_POLL_INITIAL_INTERVAL_MS = 5 * 1000

/** Poll cap keeps the background /auth/v1/user traffic well under Supabase's
 * shared per-IP auth rate limits (30 requests per 5 minutes). */
const UNLOCK_POLL_MAX_INTERVAL_MS = 30 * 1000

/**
 * True when a freshly fetched user adds nothing over the current one.
 * The verification poll uses this to avoid setting state (and thereby tearing
 * down and immediately re-running its own effect) when the server returns an
 * unchanged user — that used to create a request loop that could trip
 * Supabase's auth rate limits during signup.
 */
function isSameAuthUser(prev: User | null, next: User): boolean {
  if (!prev) return false
  return (
    prev.id === next.id &&
    prev.email_confirmed_at === next.email_confirmed_at &&
    prev.email === next.email
  )
}

/**
 * Watch for email confirmation while an unconfirmed signup is pending:
 * occasionally retries the stored sign-in credentials (to "unlock" the
 * session server-side) and polls /auth/v1/user, all on a doubling backoff
 * that keeps background traffic under Supabase's shared auth rate limits.
 * The pending sign-in stash is ref-owned by AuthProvider; this hook only
 * observes it.
 */
export function useEmailVerificationPoll({
  user,
  session,
  pendingEmail,
  pendingUnlockRef,
  unlockAttemptAtRef,
  onUser,
}: {
  user: User | null
  session: unknown
  /** In the deps only: flips when watchUnconfirmed stashes a pending sign-in. */
  pendingEmail: string | null
  pendingUnlockRef: RefObject<{ email: string; password: string } | null>
  unlockAttemptAtRef: RefObject<number>
  onUser: (user: User) => void
}) {
  const emailVerified = isEmailVerified(user)

  return useEffect(() => {
    const pending = Boolean((user && !emailVerified) || pendingUnlockRef.current)
    if (!pending) return

    // pendingEmail flips when an unconfirmed signup/login starts watching, so
    // the effect re-runs even though pendingUnlockRef is a ref.
    return startBackoffPoll(
      async (isCancelled) => {
        const unlock = pendingUnlockRef.current
        if (
          unlock &&
          !session &&
          Date.now() - unlockAttemptAtRef.current >= UNLOCK_RETRY_INTERVAL_MS
        ) {
          unlockAttemptAtRef.current = Date.now()
          const { error } = await supabase.auth.signInWithPassword(unlock)
          if (!error) pendingUnlockRef.current = null
          if (error && !isUnconfirmedAuthError(error.message)) return
        }
        const { data } = await supabase.auth.getUser()
        if (isCancelled() || !data.user) return
        if (isSameAuthUser(user, data.user)) return
        onUser(data.user)
      },
      {
        initialMs: UNLOCK_POLL_INITIAL_INTERVAL_MS,
        maxMs: UNLOCK_POLL_MAX_INTERVAL_MS,
      },
    )
  }, [session, user, pendingEmail, pendingUnlockRef, unlockAttemptAtRef, onUser])
}
