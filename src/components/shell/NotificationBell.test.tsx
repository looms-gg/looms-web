import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import * as notificationsModule from "../../state/notifications"
import type { NotificationsContextValue } from "../../state/notifications"
import { NotificationBell } from "./NotificationBell"

// Render and assert only. Click flows live in NotificationBell.interactions,
// since happy-dom event dispatching breaks once a second React root mounts
// in the same document.
function stubContext(overrides: Partial<NotificationsContextValue>): NotificationsContextValue {
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    loadError: null,
    dismissLoadError: vi.fn(),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    markOneRead: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function mountBell(value: NotificationsContextValue) {
  const host = document.createElement("div")
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <MemoryRouter>
        <notificationsModule.NotificationsContext.Provider value={value}>
          <NotificationBell />
        </notificationsModule.NotificationsContext.Provider>
      </MemoryRouter>,
    )
  })
  return {
    host,
    unmount: () => {
      flushSync(() => {
        root.unmount()
      })
    },
  }
}

describe("NotificationBell", () => {
  it("shows the unread badge count", () => {
    const mounted = mountBell(stubContext({ unreadCount: 3 }))
    expect(mounted.host.querySelector("[data-unread]")?.getAttribute("data-unread")).toBe("3")
    mounted.unmount()
  })

  it("hides the badge when unread is zero", () => {
    const mounted = mountBell(stubContext({ unreadCount: 0 }))
    expect(mounted.host.querySelector("[data-unread]")).toBeNull()
    mounted.unmount()
  })

  it("caps badge display at 99+", () => {
    const mounted = mountBell(stubContext({ unreadCount: 120 }))
    expect(mounted.host.querySelector("[data-unread]")?.textContent).toBe("99+")
    mounted.unmount()
  })

  it("renders the empty state when there are no notifications", () => {
    const mounted = mountBell(stubContext({}))
    expect(mounted.host.querySelector("[data-empty]")).not.toBeNull()
    mounted.unmount()
  })

  it("renders action text per notification type", () => {
    const mounted = mountBell(
      stubContext({
        unreadCount: 2,
        notifications: [
          {
            id: "n1",
            user_id: "u",
            actor_id: "a",
            type: "like",
            target_type: "look",
            target_id: "look-1",
            read: false,
            created_at: new Date().toISOString(),
            actor: { username: "Bee", avatar_url: null },
          },
          {
            id: "n2",
            user_id: "u",
            actor_id: "a",
            type: "reply",
            target_type: "garment",
            target_id: "cap-1",
            read: true,
            created_at: new Date().toISOString(),
            actor: null,
          },
        ],
      }),
    )
    const text = mounted.host.textContent ?? ""
    expect(text).toContain("Bee liked your look")
    expect(text).toContain("Someone replied to your comment")
    mounted.unmount()
  })
})
