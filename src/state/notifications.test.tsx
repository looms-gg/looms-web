import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest"
import * as authModule from "./auth"
import { makeAuthStub } from "../test/authStub"
import { supabase } from "../lib/supabase"
import { mockSupabaseFrom } from "../test/supabaseMock"
import type { AuthContextValue } from "./auth"
import {
  NotificationsProvider,
  useNotifications,
  notificationTargetPath,
  isNotificationRow,
} from "./notifications"

function stubAuth(userId: string | null): AuthContextValue {
  return makeAuthStub({
    user: userId ? ({ id: userId, email: "test@looms.dev" } as AuthContextValue["user"]) : null,
    session: userId ? ({} as AuthContextValue["session"]) : null,
    profile: userId
      ? ({ id: userId, username: "Tester" } as AuthContextValue["profile"])
      : null,
    emailVerified: Boolean(userId),
  })
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void }

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

type NotificationRowStub = {
  id: string
  user_id: string
  actor_id: string
  type: string
  target_type: string
  target_id: string
  read: boolean
  created_at: string
  profiles: { username: string; avatar_url: string | null }
}

type SelectResult = {
  data: NotificationRowStub[] | null
  count: number | null
  error: { message: string } | null
}

type NotificationsMock = {
  fromSpy: MockInstance
  holdSelect: Deferred<SelectResult>
  holdUnread: Deferred<{ data: null; count: number | null; error: { message: string } | null }>
  holdMarkAll: Deferred<{ data: null; error: { message: string } | null }>
  holdClearAll: Deferred<{ data: null; error: { message: string } | null }>
}

function mockNotificationsTable(): NotificationsMock {
  const holdSelect = deferred<SelectResult>()
  const holdUnread = deferred<{ data: null; count: number | null; error: { message: string } | null }>()
  const holdMarkAll = deferred<{ data: null; error: { message: string } | null }>()
  const holdClearAll = deferred<{ data: null; error: { message: string } | null }>()

  const controller = mockSupabaseFrom()
  controller.on("notifications", (query) => {
    // Two select shapes: the bounded list query (eq → order → limit → then)
    // and the head-only unread count (eq → eq → then).
    if (query.operation === "select") {
      const payload = query.payload as { options?: { head?: boolean } } | undefined
      return payload?.options?.head ? holdUnread.promise : holdSelect.promise
    }
    if (query.operation === "update") return holdMarkAll.promise
    return holdClearAll.promise
  })

  return { fromSpy: controller.fromSpy, holdSelect, holdUnread, holdMarkAll, holdClearAll }
}

function mountNotifications(userId: string | null) {
  let api!: ReturnType<typeof useNotifications>

  function Consumer() {
    api = useNotifications()
    return (
      <div
        data-loading={api.loading ? "1" : "0"}
        data-count={String(api.unreadCount)}
        data-list={api.notifications.map((n) => n.id).join(",")}
        data-error={api.loadError ?? ""}
      />
    )
  }

  const host = document.createElement("div")
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <authModule.AuthContext.Provider value={stubAuth(userId)}>
        <NotificationsProvider>
          <Consumer />
        </NotificationsProvider>
      </authModule.AuthContext.Provider>,
    )
  })

  const read = () => ({
    loading: host.querySelector("[data-loading]")?.getAttribute("data-loading") === "1",
    count: Number(host.querySelector("[data-count]")?.getAttribute("data-count") ?? "0"),
    list: host.querySelector("[data-list]")?.getAttribute("data-list") ?? "",
    error: host.querySelector("[data-error]")?.getAttribute("data-error") ?? "",
  })

  return {
    read,
    get api() {
      return api
    },
    unmount: () => {
      flushSync(() => {
        root.unmount()
      })
    },
  }
}

async function settleSelect(
  mock: NotificationsMock,
  result: SelectResult,
  unreadCount: number | null = null,
) {
  await vi.waitFor(() => {
    expect(mock.fromSpy).toHaveBeenCalled()
  })
  await act(async () => {
    mock.holdSelect.resolve(result)
    mock.holdUnread.resolve({ data: null, count: unreadCount, error: null })
  })
  await act(async () => {})
}

function selectResult(
  rows: Array<Partial<NotificationRowStub> & Pick<NotificationRowStub, "id">>,
  count: number | null = null,
): SelectResult {
  return {
    data: rows.map((row) => ({
      user_id: "user-a",
      actor_id: "user-b",
      type: "like",
      target_type: "garment",
      target_id: "cap-1",
      read: false,
      created_at: new Date().toISOString(),
      profiles: { username: "Bee", avatar_url: null },
      ...row,
    })),
    count,
    error: null,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("notificationTargetPath", () => {
  it("maps garment targets to piece pages", () => {
    expect(notificationTargetPath("garment", "cap-1")).toBe("/piece/cap-1")
  })

  it("maps look targets to look pages", () => {
    expect(notificationTargetPath("look", "look-9")).toBe("/look/look-9")
  })
})

describe("NotificationsProvider", () => {
  it("starts empty when signed out", async () => {
    mockNotificationsTable()
    const mounted = mountNotifications(null)
    await act(async () => {})
    expect(mounted.read().count).toBe(0)
    expect(mounted.read().list).toBe("")
    expect(mounted.read().loading).toBe(false)
    mounted.unmount()
  })

  it("loads the latest rows and unread count on sign-in", async () => {
    const mock = mockNotificationsTable()
    const mounted = mountNotifications("user-a")
    await vi.waitFor(() => {
      expect(mounted.read().loading).toBe(true)
    })

    await settleSelect(mock, selectResult([{ id: "n1" }]), 1)

    await vi.waitFor(() => {
      expect(mounted.read().loading).toBe(false)
    })

    expect(mounted.read().loading).toBe(false)
    expect(mounted.read().count).toBe(1)
    expect(mounted.read().list).toBe("n1")
    mounted.unmount()
  })

  it("marks all read optimistically and rolls back on error", async () => {
    const mock = mockNotificationsTable()
    const mounted = mountNotifications("user-a")
    await settleSelect(mock, selectResult([{ id: "n1" }]), 1)
    expect(mounted.read().count).toBe(1)

    let markPromise!: Promise<void>
    flushSync(() => {
      markPromise = mounted.api.markAllRead()
    })
    expect(mounted.read().count).toBe(0)

    await act(async () => {
      mock.holdMarkAll.resolve({ data: null, error: { message: "update failed" } })
      await markPromise
    })
    expect(mounted.read().count).toBe(1)
    mounted.unmount()
  })

  it("clears all rows and rolls back rows and unread badge on error", async () => {
    const mock = mockNotificationsTable()
    const mounted = mountNotifications("user-a")
    await settleSelect(mock, selectResult([{ id: "n1", read: true }, { id: "n2" }]), 1)
    expect(mounted.read().list).toBe("n1,n2")
    expect(mounted.read().count).toBe(1)

    let clearPromise!: Promise<void>
    flushSync(() => {
      clearPromise = mounted.api.clearAll()
    })
    expect(mounted.read().list).toBe("")
    expect(mounted.read().count).toBe(0)

    await act(async () => {
      mock.holdClearAll.resolve({ data: null, error: { message: "delete failed" } })
      await clearPromise
    })
    expect(mounted.read().list).toBe("n1,n2")
    expect(mounted.read().count).toBe(1)
    mounted.unmount()
  })

  it("surfaces load errors and clears them on dismiss", async () => {
    const mock = mockNotificationsTable()
    const mounted = mountNotifications("user-a")
    await settleSelect(mock, { data: null, count: null, error: { message: "select failed" } })

    expect(mounted.read().error).toBe("select failed")
    flushSync(() => {
      mounted.api.dismissLoadError()
    })
    expect(mounted.read().error).toBe("")
    mounted.unmount()
  })

  it("prepends realtime inserts addressed to the signed-in user", async () => {
    const mock = mockNotificationsTable()
    let insertHandler: ((payload: { new: Record<string, unknown> }) => void) | null = null

    const channelSpy = vi.spyOn(supabase, "channel").mockImplementation(() => {
      const ch = {
        on: (_e: string, _o: unknown, cb: (p: { new: Record<string, unknown> }) => void) => {
          insertHandler = cb
          return ch
        },
        subscribe: (cb: (s: string) => void) => {
          cb("SUBSCRIBED")
          return { unsubscribe: vi.fn() }
        },
      }
      return ch as never
    })

    const mounted = mountNotifications("user-a")
    await settleSelect(mock, { data: [], count: 0, error: null }, 0)
    expect(mounted.read().list).toBe("")

    await act(async () => {
      insertHandler?.({
        new: {
          id: "n2",
          user_id: "user-a",
          actor_id: "user-b",
          type: "like",
          target_type: "look",
          target_id: "look-5",
          read: false,
          created_at: new Date().toISOString(),
        },
      })
    })

    expect(mounted.read().list).toBe("n2")
    expect(mounted.read().count).toBe(1)
    expect(channelSpy).toHaveBeenCalled()
    mounted.unmount()
  })

  it("ignores malformed or invalid realtime insert payloads", async () => {
    const mock = mockNotificationsTable()
    let insertHandler: ((payload: { new: Record<string, unknown> }) => void) | null = null

    vi.spyOn(supabase, "channel").mockImplementation(() => {
      const ch = {
        on: (_e: string, _o: unknown, cb: (p: { new: Record<string, unknown> }) => void) => {
          insertHandler = cb
          return ch
        },
        subscribe: (cb: (s: string) => void) => {
          cb("SUBSCRIBED")
          return { unsubscribe: vi.fn() }
        },
      }
      return ch as never
    })

    const mounted = mountNotifications("user-a")
    await settleSelect(mock, { data: [], count: 0, error: null }, 0)

    await act(async () => {
      // Invalid notification type
      insertHandler?.({
        new: {
          id: "bad-1",
          user_id: "user-a",
          actor_id: "user-b",
          type: "unknown_type",
          target_type: "look",
          target_id: "look-1",
          read: false,
          created_at: new Date().toISOString(),
        },
      })
      // Invalid target type
      insertHandler?.({
        new: {
          id: "bad-2",
          user_id: "user-a",
          actor_id: "user-b",
          type: "like",
          target_type: "profile",
          target_id: "profile-1",
          read: false,
          created_at: new Date().toISOString(),
        },
      })
      // Missing id / wrong user
      insertHandler?.({
        new: {
          user_id: "user-other",
          type: "like",
        },
      })
    })

    expect(mounted.read().list).toBe("")
    expect(mounted.read().count).toBe(0)
    mounted.unmount()
  })
})

describe("isNotificationRow", () => {
  const valid = {
    id: "n1",
    user_id: "u1",
    actor_id: "u2",
    type: "like",
    target_type: "look",
    target_id: "l1",
    read: false,
    created_at: "2026-09-08T00:00:00Z",
  }

  it("accepts valid notification rows", () => {
    expect(isNotificationRow(valid)).toBe(true)
    expect(isNotificationRow({ ...valid, type: "comment", target_type: "garment" })).toBe(true)
    expect(isNotificationRow({ ...valid, type: "reply", read: true })).toBe(true)
  })

  it("rejects non-objects and null", () => {
    expect(isNotificationRow(null)).toBe(false)
    expect(isNotificationRow(undefined)).toBe(false)
    expect(isNotificationRow("string")).toBe(false)
    expect(isNotificationRow(123)).toBe(false)
  })

  it("rejects invalid types and target types", () => {
    expect(isNotificationRow({ ...valid, type: "poke" })).toBe(false)
    expect(isNotificationRow({ ...valid, target_type: "user" })).toBe(false)
  })

  it("rejects missing or wrong-typed fields", () => {
    expect(isNotificationRow({ ...valid, read: "false" })).toBe(false)
    expect(isNotificationRow({ ...valid, id: 123 })).toBe(false)
    const { id: _, ...missingId } = valid
    expect(isNotificationRow(missingId)).toBe(false)
  })
})
