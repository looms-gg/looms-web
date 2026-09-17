import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase, type Database, type ProfileRow } from "../lib/supabase"
import { isEmailVerified, isUnconfirmedAuthError } from "../lib/auth/emailStatus"
import { useEmailVerificationPoll } from "./emailVerificationPoll"
import { getEmailVerifyControls } from "./verifyEmail"
import type { OAuthProvider } from "../lib/auth/oauth"
import {
  MAX_LIMITS,
  sanitizeMinecraftUsername,
  sanitizeText,
  sanitizeUrl,
  sanitizeUsername,
} from "../lib/sanitize"
import { resolveAvatarUrl } from "../lib/content/profileDisplay"
import { formatErrorMessage } from "../lib/errorFormat"
import { fetchProfileRow, mapProfileRow } from "../lib/content/mapProfileRow"
import { absoluteAppUrl } from "../lib/basePath"

const LAST_SEEN_CLIENT_THROTTLE_MS = 5 * 60 * 1000

export type ProfileUpdates = {
  username?: string
  minecraft_username?: string | null
  bio?: string | null
  banner_url?: string | null
  avatar_url?: string | null
  show_last_seen?: boolean
  show_likes?: boolean
  notify_likes?: boolean
  notify_comments?: boolean
  notify_replies?: boolean
}

const BOOLEAN_UPDATE_FIELDS = [
  "show_last_seen",
  "show_likes",
  "notify_likes",
  "notify_comments",
  "notify_replies",
] as const satisfies readonly (keyof ProfileUpdates)[]

/**
 * Normalize an auth/RPC error into the context's `{ error }` shape. The
 * message stays raw on purpose: `error.message` is always the server text,
 * and the display boundary applies formatErrorMessage exactly once.
 */
function toAuthError(error: { message: string } | null): Error | null {
  return error ? new Error(error.message) : null
}

export type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: ProfileRow | null
  avatarUrl: string | null
  loading: boolean
  profileError: string | null
  dismissProfileError: () => void
  emailVerified: boolean
  pendingEmail: string | null
  resendConfirmation: () => Promise<{ error: Error | null }>
  /**
   * Error is null also when the unconfirmed-confirmation flow opened
   * (pendingEmail set, watchUnconfirmed started), not just on sign-in
   * complete. Callers must not treat null as "signed in" unconditionally.
   */
  signInWithPassword: (credentials: {
    email: string
    password: string
    captchaToken?: string
  }) => Promise<{ error: Error | null }>
  signUpWithPassword: (data: {
    email: string
    password: string
    username: string
    captchaToken?: string
  }) => Promise<{ error: Error | null }>
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: Error | null }>
  completeOnboarding: (username: string) => Promise<{ error: Error | null }>
  signInWithOtp: (params: {
    email: string
    captchaToken?: string
  }) => Promise<{ error: Error | null }>
  resetPasswordForEmail: (params: {
    email: string
    captchaToken?: string
  }) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  deleteAccount: () => Promise<{ error: Error | null }>
  updateProfile: (updates: {
    username?: string
    minecraft_username?: string | null
    bio?: string | null
    banner_url?: string | null
    avatar_url?: string | null
    show_last_seen?: boolean
    show_likes?: boolean
    notify_likes?: boolean
    notify_comments?: boolean
    notify_replies?: boolean
  }) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const pendingUnlockRef = useRef<{ email: string; password: string } | null>(null)
  const unlockAttemptAtRef = useRef(0)
  const verifiedFlashTimer = useRef<number | null>(null)
  const openedForUserId = useRef<string | null>(null)
  const lastSeenTouchedAt = useRef(0)

  const emailVerified = isEmailVerified(user)

  const touchLastSeen = useCallback(() => {
    const now = Date.now()
    if (now - lastSeenTouchedAt.current < LAST_SEEN_CLIENT_THROTTLE_MS) return
    lastSeenTouchedAt.current = now
    void supabase.rpc("touch_last_seen")
  }, [])

  const watchUnconfirmed = useCallback((email: string, password: string) => {
    pendingUnlockRef.current = { email, password }
    setPendingEmail(email)
    getEmailVerifyControls().setOpen(true)
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await fetchProfileRow("id", userId)

      if (error) {
        setProfileError(formatErrorMessage(error))
        return
      }

      setProfileError(null)
      if (data) {
        setProfile(mapProfileRow(data))
      }
    } catch (err) {
      setProfileError(formatErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!mounted) return
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        if (initialSession?.user) {
          void fetchProfile(initialSession.user.id).finally(() => {
            if (mounted) setLoading(false)
          })
          touchLastSeen()
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!mounted) return
        setProfileError(formatErrorMessage(err))
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        await fetchProfile(newSession.user.id)
        touchLastSeen()
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, touchLastSeen])

  useEffect(() => {
    if (!session?.user) return
    touchLastSeen()
    function onVisibility() {
      if (document.visibilityState === "visible") touchLastSeen()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [session?.user, touchLastSeen])

  useEffect(() => {
    if (!user) {
      openedForUserId.current = null
      return
    }

    if (!isEmailVerified(user)) {
      setPendingEmail(user.email ?? null)
      if (openedForUserId.current !== user.id) {
        openedForUserId.current = user.id
        getEmailVerifyControls().setOpen(true)
      }
      return
    }

    pendingUnlockRef.current = null
    setPendingEmail(null)
    if (!getEmailVerifyControls().getOpen()) return
    if (verifiedFlashTimer.current) window.clearTimeout(verifiedFlashTimer.current)
    verifiedFlashTimer.current = window.setTimeout(() => {
      getEmailVerifyControls().setOpen(false)
      verifiedFlashTimer.current = null
    }, 1600)
  }, [user])

  useEmailVerificationPoll({
    user,
    session,
    pendingEmail,
    pendingUnlockRef,
    unlockAttemptAtRef,
    onUser: setUser,
  })

  const signInWithPassword = useCallback(
    async ({
      email,
      password,
      captchaToken,
    }: {
      email: string
      password: string
      captchaToken?: string
    }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(captchaToken ? { options: { captchaToken } } : {}),
      })
      if (error && isUnconfirmedAuthError(error.message)) {
        watchUnconfirmed(email, password)
        return { error: null }
      }
      return { error: toAuthError(error) }
    },
    [watchUnconfirmed],
  )

  const signUpWithPassword = useCallback(
    async ({
      email,
      password,
      username,
      captchaToken,
    }: {
      email: string
      password: string
      username: string
      captchaToken?: string
    }) => {
      const cleanUsername = sanitizeUsername(username)
      if (!cleanUsername) {
        return { error: new Error("Please choose a display username.") }
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          captchaToken,
          // Include the Vite base path so confirmation lands on the deployed
          // app (…/looms-web/), not the bare origin.
          emailRedirectTo: absoluteAppUrl(),
          data: {
            username: cleanUsername,
          },
        },
      })

      if (error) return { error: toAuthError(error) }

      if (data.user && !isEmailVerified(data.user)) {
        watchUnconfirmed(email, password)
      }

      if (data.user) {
        const profilePayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
          id: data.user.id,
          username: cleanUsername,
        }
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(profilePayload)
        // A missing profile row would break onboarding, so surface it instead
        // of silently continuing with an account that has no profile.
        if (profileError) {
          return { error: new Error(profileError.message) }
        }
        await fetchProfile(data.user.id)
      }

      return { error: null }
    },
    [fetchProfile, watchUnconfirmed],
  )

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${absoluteAppUrl()}/auth/callback` },
    })
    return { error: toAuthError(error) }
  }, [])

  const completeOnboarding = useCallback(
    async (username: string) => {
      const clean = sanitizeUsername(username)
      if (!clean) return { error: new Error("Please choose a display username.") }
      const { error } = await supabase.rpc("complete_onboarding", { p_username: clean })
      if (error) return { error: toAuthError(error) }
      if (user) await fetchProfile(user.id)
      return { error: null }
    },
    [user, fetchProfile],
  )

  const signInWithOtp = useCallback(
    async ({ email, captchaToken }: { email: string; captchaToken?: string }) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          captchaToken,
          emailRedirectTo: absoluteAppUrl(),
        },
      })
        return { error: toAuthError(error) }
    },
    [],
  )

  const resetPasswordForEmail = useCallback(
    async ({ email, captchaToken }: { email: string; captchaToken?: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        captchaToken,
        redirectTo: `${absoluteAppUrl()}/reset-password`,
      })
      return { error: toAuthError(error) }
    },
    [],
  )

  const clearLocalAuthState = useCallback(() => {
    setUser(null)
    setSession(null)
    setProfile(null)
    setPendingEmail(null)
    getEmailVerifyControls().setOpen(false)
    pendingUnlockRef.current = null
    openedForUserId.current = null
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    clearLocalAuthState()
    return { error: error ? new Error(error.message) : null }
  }, [clearLocalAuthState])

  // Self-serve GDPR deletion: the RPC removes the profile row (cascades clear
  // all user content); sign-out runs unconditionally afterwards so local state
  // never outlives the account, even if the auth call errors.
  const deleteAccount = useCallback(async () => {
    const { error: rpcError } = await supabase.rpc("delete_my_account")
    const { error: signOutError } = await supabase.auth.signOut()
    clearLocalAuthState()
    if (rpcError) return { error: toAuthError(rpcError) }
    return { error: signOutError ? new Error(signOutError.message) : null }
  }, [clearLocalAuthState])

  const updateProfile = useCallback(
    async (updates: ProfileUpdates) => {
      if (!user) return { error: new Error("Not authenticated") }
      const cleanUpdates: ProfileUpdates = {}

      if (updates.username !== undefined) {
        const cleanUsername = sanitizeUsername(updates.username)
        if (!cleanUsername) {
          return { error: new Error("Please choose a display username.") }
        }
        cleanUpdates.username = cleanUsername
      }
      if (updates.minecraft_username !== undefined) {
        cleanUpdates.minecraft_username = updates.minecraft_username
          ? sanitizeMinecraftUsername(updates.minecraft_username)
          : null
      }
      if (updates.bio !== undefined) {
        cleanUpdates.bio = updates.bio
          ? sanitizeText(updates.bio, MAX_LIMITS.BIO, { multiline: true })
          : null
      }
      if (updates.banner_url !== undefined) {
        cleanUpdates.banner_url = updates.banner_url
          ? sanitizeUrl(updates.banner_url)
          : null
      }
      if (updates.avatar_url !== undefined) {
        cleanUpdates.avatar_url = updates.avatar_url
          ? sanitizeUrl(updates.avatar_url)
          : null
      }
      for (const field of BOOLEAN_UPDATE_FIELDS) {
        if (updates[field] !== undefined) {
          cleanUpdates[field] = updates[field]
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update(cleanUpdates)
        .eq("id", user.id)

      if (error) return { error: new Error(error.message) }
      await fetchProfile(user.id)
      return { error: null }
    },
    [user, fetchProfile],
  )

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  const resendConfirmation = useCallback(async () => {
    const email = user?.email ?? pendingEmail
    if (!email) return { error: new Error("No email to confirm") }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: absoluteAppUrl() },
    })
    return { error: error ? new Error(error.message) : null }
  }, [pendingEmail, user?.email])

  const dismissProfileError = useCallback(() => {
    setProfileError(null)
  }, [])

  const avatarUrl = resolveAvatarUrl(profile)

  const value: AuthContextValue = {
    user,
    session,
    profile,
    avatarUrl,
    loading,
    profileError,
    dismissProfileError,
    emailVerified,
    pendingEmail,
    resendConfirmation,
    signInWithPassword,
    signUpWithPassword,
    signInWithOAuth,
    completeOnboarding,
    signInWithOtp,
    resetPasswordForEmail,
    signOut,
    deleteAccount,
    updateProfile,
    refreshProfile,
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext)
}
