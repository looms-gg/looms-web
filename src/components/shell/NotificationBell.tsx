import { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell } from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { useDismissable } from "./useDismissable"
import {
  notificationTargetPath,
  useNotificationsOptional,
  type NotificationWithType,
} from "../../state/notifications"

function relativeTime(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function badgeLabel(count: number): string {
  return count > 99 ? "99+" : String(count)
}

function actionText(type: string, actorName: string | null): string {
  const who = actorName ?? "Someone"
  if (type === "like") return `${who} liked your`
  if (type === "comment") return `${who} commented on your`
  return `${who} replied to your comment`
}

function targetNoun(targetType: string, type: string): string {
  if (type === "reply") return "comment"
  return targetType === "look" ? "look" : "piece"
}

function NotificationRow({
  notification,
  index,
  onOpen,
}: {
  notification: NotificationWithType
  index: number
  onOpen: (n: NotificationWithType) => void
}) {
  const path = notificationTargetPath(notification.target_type, notification.target_id)
  return (
    <a
      data-notification
      data-href={path}
      href={path}
      data-read={notification.read ? "1" : "0"}
      className={`notification-item ${notification.read ? "" : "notification-item-unread"}`}
      style={{ "--item-i": index } as React.CSSProperties}
      onClick={(e) => {
        e.preventDefault()
        onOpen(notification)
      }}
    >
      {notification.actor?.avatar_url ? (
        <img
          src={notification.actor.avatar_url}
          alt=""
          className="notification-avatar"
          style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }} />
      ) : (
        <span className="notification-avatar-fallback">
          {(notification.actor?.username ?? "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="notification-copy">
        <span className="notification-text">
          {actionText(notification.type, notification.actor?.username ?? null)}
          {notification.type === "reply" ? null : (
            <>
              {" "}
              {targetNoun(notification.target_type, notification.type)}
            </>
          )}
        </span>
        <span className="notification-time">{relativeTime(notification.created_at)}</span>
      </span>
      {!notification.read ? <span className="notification-dot" aria-hidden /> : null}
    </a>
  )
}

function NotificationPanel({
  open,
  unreadCount,
  loadError,
  items,
  loading,
  dismissLoadError,
  onOpenNotification,
  onMarkAllRead,
  onClearAll,
}: {
  open: boolean
  unreadCount: number
  loadError: string | null
  items: NotificationWithType[]
  loading: boolean
  dismissLoadError: () => void
  onOpenNotification: (n: NotificationWithType) => void
  onMarkAllRead: () => void
  onClearAll: () => void
}) {
  return (
    <div data-open={open} className="notification-panel" aria-label="Notifications">
      <div className="notification-head">
        <span className="notification-title">Notifications</span>
        {unreadCount > 0 ? (
          <span className="notification-head-count tabular-nums">
            {badgeLabel(unreadCount)} unread
          </span>
        ) : null}
      </div>
      <div className="notification-divider" />

      {loadError ? (
        <div className="notification-empty">
          <p className="text-xs text-error" role="alert">
            {loadError}
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-xs rounded-full font-bold"
            onClick={dismissLoadError}
          >
            OK
          </button>
        </div>
      ) : null}

      {items.length === 0 && !loadError ? (
        <div data-empty className="notification-empty">
          <p className="notification-empty-title">
            {loading ? "Waking the bell..." : "Nothing here yet."}
          </p>
          <p className="notification-empty-hint">
            Likes, comments, and replies to your pieces and looks show up here.
          </p>
        </div>
      ) : null}

      <div className="notification-list">
        {items.map((n, i) => (
          <NotificationRow key={n.id} notification={n} index={i} onOpen={onOpenNotification} />
        ))}
      </div>

      {items.length > 0 ? (
        <>
          <div className="notification-divider" />
          <div className="notification-footer">
            <button
              type="button"
              data-mark-all
              className="notification-action"
              onClick={onMarkAllRead}
            >
              Mark all read
            </button>
            <button
              type="button"
              data-clear-all
              className="notification-action notification-action-danger"
              onClick={onClearAll}
            >
              Clear all
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function NotificationBell() {
  const notifications = useNotificationsOptional()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const close = useCallback(() => setOpen(false), [])
  const toggleOpen = useCallback(() => setOpen((v) => !v), [])
  useDismissable(open, rootRef, close)

  if (!notifications) return null

  const items = notifications.notifications
  const { unreadCount, loading, loadError, dismissLoadError, markAllRead, markOneRead, clearAll } =
    notifications

  const handleOpenNotification = (n: NotificationWithType) => {
    setOpen(false)
    void markOneRead(n.id)
    navigate(notificationTargetPath(n.target_type, n.target_id))
  }

  const handleMarkAllRead = () => {
    void markAllRead()
  }

  const handleClearAll = () => {
    void clearAll()
  }

  return (
    <div ref={rootRef} className="notification-root" data-bell>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${badgeLabel(unreadCount)} unread` : "Notifications"}
        title="Notifications"
        className={`btn btn-ghost relative size-11 min-h-11 rounded-full p-0 active:scale-[0.96] transition-transform ${
          unreadCount > 0 ? "notification-bell-unread" : ""
        }`}
        onClick={toggleOpen}
      >
        <Icon icon={Bell} size="md" />
        {unreadCount > 0 ? (
          <span
            data-unread={unreadCount}
            className="tabular-nums absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-content ring-2 ring-base-100"
          >
            {badgeLabel(unreadCount)}
          </span>
        ) : null}
      </button>

      <NotificationPanel
        open={open}
        unreadCount={unreadCount}
        loadError={loadError}
        items={items}
        loading={loading}
        dismissLoadError={dismissLoadError}
        onOpenNotification={handleOpenNotification}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAll}
      />
    </div>
  )
}
