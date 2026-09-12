import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { formatErrorMessage } from "../lib/errorFormat"
import { supabase, type NotificationRow } from "../lib/supabase"
import { useAuthOptional } from "./auth"

export type { NotificationRow } from "../lib/supabase"

export const MAX_NOTIFICATIONS = 20

export type NotificationWithType = NotificationRow & {
  actor: { username: string; avatar_url: string | null } | null
}

export type NotificationsContextValue = {
  notifications: NotificationWithType[]
  unreadCount: number
  loading: boolean
  loadError: string | null
  dismissLoadError: () => void
  markAllRead: () => Promise<void>
  markOneRead: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function notificationTargetPath(
  targetType: NotificationRow["target_type"],
  targetId: string,
): string {
  return targetType === "look"
    ? `/look/${encodeURIComponent(targetId)}`
    : `/piece/${encodeURIComponent(targetId)}`
}

const POLL_INITIAL_MS = 5 * 1000
const POLL_MAX_MS = 30 * 1000

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const auth = useAuthOptional()
  const userId = auth?.user?.id ?? null
  const [notifications, setNotifications] = useState<NotificationWithType[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const realtimeHealthyRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      setLoadError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    void supabase
      .from("notifications")
      .select("*, profiles!notifications_actor_id_fkey(username, avatar_url)", {
        count: "exact",
      })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS)
      .then(({ data, count, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(formatErrorMessage(error))
          setNotifications([])
          setUnreadCount(0)
        } else {
          setLoadError(null)
          const rows: NotificationWithType[] = (data ?? []).map((row) => ({
            id: row.id,
            user_id: row.user_id,
            actor_id: row.actor_id,
            type: row.type,
            target_type: row.target_type,
            target_id: row.target_id,
            read: row.read,
            created_at: row.created_at,
            actor: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
          }))
          setNotifications(rows)
          setUnreadCount(Math.max(count ?? 0, rows.filter((r) => !r.read).length))
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Realtime: one channel per user. If the socket drops, the poll fallback
  // below carries the badge until SUBSCRIBED arrives again.
  useEffect(() => {
    if (!userId) return

    realtimeHealthyRef.current = false
    let channel: RealtimeChannel | null = null

    const onInsert = (payload: { new: Record<string, unknown> | null }) => {
      const next = payload?.new
      if (!next || next.user_id !== userId) return
      setUnreadCount((c) => c + 1)
      setNotifications((prev) => {
        if (prev.some((r) => r.id === next.id)) return prev
        const row: NotificationWithType = {
          id: String(next.id),
          user_id: String(next.user_id),
          actor_id: String(next.actor_id),
          type: next.type as NotificationRow["type"],
          target_type: next.target_type as NotificationRow["target_type"],
          target_id: String(next.target_id),
          read: Boolean(next.read),
          created_at: String(next.created_at),
          actor: null,
        }
        return [row, ...prev].slice(0, MAX_NOTIFICATIONS)
      })
    }

    channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        onInsert as never,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") realtimeHealthyRef.current = true
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          realtimeHealthyRef.current = false
        }
      })

    return () => {
      if (channel) void supabase.removeChannel(channel)
      realtimeHealthyRef.current = false
    }
  }, [userId])

  // Poll fallback: backoff 5s→30s while the tab is visible; pauses while
  // realtime is healthy.
  useEffect(() => {
    if (!userId) return
    const uid = userId
    let cancelled = false
    let running = false
    let delayMs = POLL_INITIAL_MS
    let timer: number | null = null

    async function tick() {
      if (cancelled || running || document.visibilityState === "hidden") return
      if (realtimeHealthyRef.current) return
      running = true
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("read", false)
        if (!cancelled && !error && typeof count === "number") {
          setUnreadCount(count)
        }
      } catch {
        // Transient network failure — the next scheduled attempt retries.
      } finally {
        running = false
      }
    }

    function scheduleNext() {
      if (cancelled) return
      timer = window.setTimeout(() => {
        void tick().finally(scheduleNext)
      }, delayMs)
      delayMs = Math.min(delayMs * 2, POLL_MAX_MS)
    }

    scheduleNext()
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [userId])

  const dismissLoadError = useCallback(() => {
    setLoadError(null)
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    const prevCount = unreadCount
    setUnreadCount(0)
    setNotifications((prev) => prev.map((r) => (r.read ? r : { ...r, read: true })))
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)
    if (error) {
      setUnreadCount(prevCount)
      setLoadError(formatErrorMessage(error))
    }
  }, [userId, unreadCount])

  const markOneRead = useCallback(
    async (id: string) => {
      if (!userId) return
      const target = notifications.find((r) => r.id === id)
      if (!target || target.read) return
      setUnreadCount((c) => Math.max(c - 1, 0))
      setNotifications((prev) => prev.map((r) => (r.id === id ? { ...r, read: true } : r)))
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("id", id)
      if (error) {
        setUnreadCount((c) => c + 1)
        setLoadError(formatErrorMessage(error))
      }
    },
    [userId, notifications],
  )

  const clearAll = useCallback(async () => {
    if (!userId) return
    const prevRows = notifications
    setNotifications([])
    setUnreadCount(0)
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId)
    if (error) {
      setNotifications(prevRows)
      setUnreadCount(prevRows.filter((r) => !r.read).length)
      setLoadError(formatErrorMessage(error))
    }
  }, [userId, notifications])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      loadError,
      dismissLoadError,
      markAllRead,
      markOneRead,
      clearAll,
    }),
    [
      notifications,
      unreadCount,
      loading,
      loadError,
      dismissLoadError,
      markAllRead,
      markOneRead,
      clearAll,
    ],
  )

  return <NotificationsContext value={value}>{children}</NotificationsContext>
}

export function useNotificationsOptional(): NotificationsContextValue | null {
  return useContext(NotificationsContext)
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider")
  return ctx
}
