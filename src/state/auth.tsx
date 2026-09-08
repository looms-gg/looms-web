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
import { isEmailVerified, isUnconfirmedAuthError } from "./emailStatus"
import {
  MAX_LIMITS,
  sanitizeMinecraftUsername,
  sanitizeText,
  sanitizeUrl,
  sanitizeUsername,
} from "../lib/sanitize"
import { resolveAvatarUrl } from "./profileDisplay"
import { formatErrorMessage } from "../lib/errorFormat"
import { mapProfileRow, PROFILE_SELECT } from "../lib/mapProfileRow"

const LAST_SEEN_CLIENT_THROTTLE_MS = 5 * 60 * 1000

export interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: ProfileRow | null
  avatarUrl: string | null
  loading: boolean
  profileError: string | null
  dismissProfileError: () => void
  emailVerified: boolean
  pendingEmail: string | null
  emailVerifyOpen: boolean
  openEmailVerify: () => void
  dismissEmailVerify: () => void
  resendConfirmation: () => Promise<{ error: Error | null }>
  signInWithPassword: (credentials: {
    email: string
    password: string
  }) => Promise<{ error: Error | null }>
  signUpWithPassword: (data: {
    email: string
    password: string
    username: string
    minecraftUsername?: string
  }) => Promise<{ error: Error | null }>
  signInWithOtp: (params: {
    email: string
  }) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  updateProfile: (updates: {
    username?: string
    minecraft_username?: string | null
    bio?: string | null
    banner_url?: string | null
    avatar_url?: string | null
    show_last_seen?: boolean
    show_likes?: boolean
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
  const [emailVerifyOpen, setEmailVerifyOpen] = useState(false)
  const pendingUnlockRef = useRef<{ email: string; password: string } | null>(null)
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
    setEmailVerifyOpen(true)
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .maybeSingle()

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
          fetchProfile(initialSession.user.id).finally(() => {
            if (mounted) setLoading(false)
          })
          touchLastSeen()
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Error retrieving auth session:", err)
        if (mounted) setLoading(false)
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
        setEmailVerifyOpen(true)
      }
      return
    }

    pendingUnlockRef.current = null
    setPendingEmail(null)
    if (!emailVerifyOpen) return
    if (verifiedFlashTimer.current) window.clearTimeout(verifiedFlashTimer.current)
    verifiedFlashTimer.current = window.setTimeout(() => {
      setEmailVerifyOpen(false)
      verifiedFlashTimer.current = null
    }, 1600)
  }, [emailVerifyOpen, user])

  useEffect(() => {
    const pending = Boolean((user && !isEmailVerified(user)) || pendingUnlockRef.current)
    if (!pending) return

    let cancelled = false

    async function tick() {
      if (cancelled || document.visibilityState === "hidden") return
      const unlock = pendingUnlockRef.current
      if (unlock && !session) {
        const { error } = await supabase.auth.signInWithPassword(unlock)
        if (!error) pendingUnlockRef.current = null
        if (error && !isUnconfirmedAuthError(error.message)) return
      }
      const { data } = await supabase.auth.getUser()
      if (cancelled || !data.user) return
      setUser(data.user)
    }

    const interval = window.setInterval(() => void tick(), 4000)
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick()
    }
    document.addEventListener("visibilitychange", onVisible)
    void tick()

    return () => {
      cancelled = true
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [session, user, emailVerified])

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error && isUnconfirmedAuthError(error.message)) {
        watchUnconfirmed(email, password)
        return { error: null }
      }
      return { error: error ? new Error(formatErrorMessage(error)) : null }
    },
    [watchUnconfirmed],
  )

  const signUpWithPassword = useCallback(
    async ({
      email,
      password,
      username,
      minecraftUsername,
    }: {
      email: string
      password: string
      username: string
      minecraftUsername?: string
    }) => {
      const cleanUsername = sanitizeUsername(username) || "user"
      const cleanMc = minecraftUsername ? sanitizeMinecraftUsername(minecraftUsername) : null
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: {
            username: cleanUsername,
            minecraft_username: cleanMc || null,
          },
        },
      })

      if (error) return { error: new Error(error.message) }

      if (data.user && !isEmailVerified(data.user)) {
        watchUnconfirmed(email, password)
      }

      if (!data.session && data.user && !isEmailVerified(data.user)) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError && !isUnconfirmedAuthError(signInError.message)) {
          return { error: new Error(signInError.message) }
        }
      }

      if (data.user) {
        const profilePayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
          id: data.user.id,
          username: cleanUsername,
          minecraft_username: cleanMc || null,
        }
        await supabase.from("profiles").upsert(profilePayload)
        await fetchProfile(data.user.id)
      }

      return { error: null }
    },
    [fetchProfile, watchUnconfirmed],
  )

  const signInWithOtp = useCallback(async ({ email }: { email: string }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error: error ? new Error(error.message) : null }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    setPendingEmail(null)
    setEmailVerifyOpen(false)
    pendingUnlockRef.current = null
    openedForUserId.current = null
    return { error: error ? new Error(error.message) : null }
  }, [])

  const updateProfile = useCallback(
    async (updates: {
      username?: string
      minecraft_username?: string | null
      bio?: string | null
      banner_url?: string | null
      avatar_url?: string | null
      show_last_seen?: boolean
      show_likes?: boolean
    }) => {
      if (!user) return { error: new Error("Not authenticated") }
      const cleanUpdates: {
        username?: string
        minecraft_username?: string | null
        bio?: string | null
        banner_url?: string | null
        avatar_url?: string | null
        show_last_seen?: boolean
        show_likes?: boolean
      } = {}

      if (updates.username !== undefined) {
        cleanUpdates.username = sanitizeUsername(updates.username) || "user"
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
      if (updates.show_last_seen !== undefined) {
        cleanUpdates.show_last_seen = updates.show_last_seen
      }
      if (updates.show_likes !== undefined) {
        cleanUpdates.show_likes = updates.show_likes
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
    const { error } = await supabase.auth.resend({ type: "signup", email })
    return { error: error ? new Error(error.message) : null }
  }, [pendingEmail, user?.email])

  const openEmailVerify = useCallback(() => {
    setEmailVerifyOpen(true)
  }, [])

  const dismissEmailVerify = useCallback(() => {
    setEmailVerifyOpen(false)
  }, [])

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
    emailVerifyOpen,
    openEmailVerify,
    dismissEmailVerify,
    resendConfirmation,
    signInWithPassword,
    signUpWithPassword,
    signInWithOtp,
    signOut,
    updateProfile,
    refreshProfile,
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
