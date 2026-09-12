import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import * as notificationsModule from "../../state/notifications"
import type { NotificationsContextValue } from "../../state/notifications"
import { NotificationBell } from "./NotificationBell"

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
  document.body.appendChild(host)
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
      host.remove()
    },
  }
}

// Everything runs in one test because happy-dom event dispatching breaks
// once a second React root mounts into the same document.
describe("NotificationBell interactions", () => {
  it("opens the panel, marks one read, then mark all + clear all", async () => {
    const markOneRead = vi.fn().mockResolvedValue(undefined)
    const markAllRead = vi.fn().mockResolvedValue(undefined)
    const clearAll = vi.fn().mockResolvedValue(undefined)
    const mounted = mountBell(
      stubContext({
        unreadCount: 1,
        markOneRead,
        markAllRead,
        clearAll,
        notifications: [
          {
            id: "n1",
            user_id: "u",
            actor_id: "a",
            type: "like",
            target_type: "garment",
            target_id: "cap-1",
            read: false,
            created_at: new Date().toISOString(),
            actor: { username: "Bee", avatar_url: null },
          },
        ],
      }),
    )
    const row = mounted.host.querySelector<HTMLAnchorElement>("[data-notification]")
    expect(row?.getAttribute("data-href")).toBe("/piece/cap-1")
    expect(mounted.host.textContent).toContain("Bee")

    flushSync(() => {
      mounted.host.querySelector<HTMLButtonElement>("[data-bell] > button")?.click()
    })
    await act(async () => {
      mounted.host.querySelector<HTMLAnchorElement>("[data-notification]")?.click()
    })
    expect(markOneRead).toHaveBeenCalledWith("n1")

    flushSync(() => {
      mounted.host.querySelector<HTMLButtonElement>("[data-mark-all]")?.click()
    })
    await act(async () => {
      mounted.host.querySelector<HTMLButtonElement>("[data-clear-all]")?.click()
    })
    expect(markAllRead).toHaveBeenCalled()
    expect(clearAll).toHaveBeenCalled()
    mounted.unmount()
  })
})
