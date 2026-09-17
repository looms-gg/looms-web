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
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js"
import { formatErrorMessage } from "../lib/errorFormat"
import { startBackoffPoll } from "../lib/backoffPoll"
import {
  supabase,
  type NotificationRow,
  type NotificationTargetType,
  type NotificationType,
} from "../lib/supabase"
import { useAuthOptional } from "./auth"

export type { NotificationRow } from "../lib/supabase"

const VALID_NOTIFICATION_TYPES = new Set<NotificationType>(["like", "comment", "reply"])
const VALID_NOTIFICATION_TARGET_TYPES = new Set<NotificationTargetType>(["look", "garment"])

export function isNotificationRow(val: unknown): val is NotificationRow {
  if (!val || typeof val !== "object") return false
  const r = val as Record<string, unknown>
  return (
    typeof r.id === "string" &&
    typeof r.user_id === "string" &&
    typeof r.actor_id === "string" &&
    typeof r.type === "string" &&
    VALID_NOTIFICATION_TYPES.has(r.type as NotificationType) &&
    typeof r.target_type === "string" &&
    VALID_NOTIFICATION_TARGET_TYPES.has(r.target_type as NotificationTargetType) &&
    typeof r.target_id === "string" &&
    typeof r.read === "boolean" &&
    typeof r.created_at === "string"
  )
}

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

    void supabase.from("notifications")
      .select("*, profiles!notifications_actor_id_fkey(username, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS)
      .then(({ data, error }) => {
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
          // The badge counts unread only. The list query is limit-bounded and
          // counts all rows, so the exact unread total comes from a head-only
          // query — same shape the poll tick uses.
          void supabase.from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("read", false)
            .then(({ count: unread }) => {
              if (!cancelled && typeof unread === "number") setUnreadCount(unread)
            })
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

    const onInsert = (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => {
      const next = payload?.new
      if (!isNotificationRow(next) || next.user_id !== userId) return
      setUnreadCount((c) => c + 1)
      setNotifications((prev) => {
        if (prev.some((r) => r.id === next.id)) return prev
        const row: NotificationWithType = {
          ...next,
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
        onInsert,
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
    return startBackoffPoll(
      async (isCancelled) => {
        if (realtimeHealthyRef.current) return
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("read", false)
        if (!isCancelled() && !error && typeof count === "number") {
          setUnreadCount(count)
        }
      },
      { initialMs: POLL_INITIAL_MS, maxMs: POLL_MAX_MS },
    )
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
    const prevUnread = unreadCount
    setNotifications([])
    setUnreadCount(0)
    const { error } = await supabase.from("notifications").delete().eq("user_id", userId)
    if (error) {
      setNotifications(prevRows)
      setUnreadCount(prevUnread)
      setLoadError(formatErrorMessage(error))
    }
  }, [userId, notifications, unreadCount])

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

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider")
  return ctx
}

export function useNotificationsOptional(): NotificationsContextValue | null {
  return useContext(NotificationsContext)
}
