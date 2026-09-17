import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as authModule from "./auth"
import { makeAuthStub } from "../test/authStub"
import { mockSupabaseFrom } from "../test/supabaseMock"
import type { AuthContextValue } from "./auth"
import { LikesProvider, useLikes } from "./likes"

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

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

type SelectResult = {
  data: Array<{ target_type: string; target_id: string }> | null
  error: { message: string } | null
}

type MutationResult = { data: null; error: { message: string } | null }

type LikesMock = {
  holdSelect: Deferred<SelectResult>
  holdInsert: Deferred<MutationResult>
  holdDelete: Deferred<MutationResult>
}

function mockLikesTable(): LikesMock {
  const holdSelect = deferred<SelectResult>()
  const holdInsert = deferred<MutationResult>()
  const holdDelete = deferred<MutationResult>()

  mockSupabaseFrom().on("likes", (query) => {
    if (query.operation === "insert") return holdInsert.promise
    if (query.operation === "delete") return holdDelete.promise
    return holdSelect.promise
  })

  return { holdSelect, holdInsert, holdDelete }
}

function mountLikes(
  userId: string | null,
  probeType: "garment" | "look" = "garment",
  probeId = "piece-1",
) {
  let api!: ReturnType<typeof useLikes>

  function Consumer() {
    api = useLikes()
    return (
      <div
        data-loading={api.loading ? "1" : "0"}
        data-liked={api.isLiked(probeType, probeId) ? "1" : "0"}
        data-error={api.loadError ?? ""}
        data-size={String(api.likedKeys.size)}
      />
    )
  }

  const host = document.createElement("div")
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <authModule.AuthContext.Provider value={stubAuth(userId)}>
        <LikesProvider>
          <Consumer />
        </LikesProvider>
      </authModule.AuthContext.Provider>,
    )
  })

  const read = () => ({
    loading: host.querySelector("[data-loading]")?.getAttribute("data-loading") === "1",
    liked: host.querySelector("[data-liked]")?.getAttribute("data-liked") === "1",
    error: host.querySelector("[data-error]")?.getAttribute("data-error") ?? "",
    size: Number(host.querySelector("[data-size]")?.getAttribute("data-size") ?? "0"),
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
  mock: LikesMock,
  read: () => { loading: boolean },
  result: SelectResult,
) {
  await vi.waitFor(() => {
    expect(read().loading).toBe(true)
  })
  await act(async () => {
    mock.holdSelect.resolve(result)
  })
  await vi.waitFor(() => {
    expect(read().loading).toBe(false)
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("LikesProvider", () => {
  it("toggleLike requires auth and returns error when no user", async () => {
    mockLikesTable()
    const mounted = mountLikes(null)

    const result = await mounted.api.toggleLike("garment", "piece-1")

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe("Not authenticated")
    expect(mounted.read().liked).toBe(false)
    expect(mounted.read().size).toBe(0)
    mounted.unmount()
  })

  it("optimistically adds and removes likedKeys", async () => {
    const mock = mockLikesTable()
    const mounted = mountLikes("user-a", "garment", "piece-1")
    await settleSelect(mock, mounted.read, { data: [], error: null })

    let addPromise!: Promise<{ error: Error | null }>
    flushSync(() => {
      addPromise = mounted.api.toggleLike("garment", "piece-1")
    })
    expect(mounted.read().liked).toBe(true)

    let addResult!: { error: Error | null }
    await act(async () => {
      mock.holdInsert.resolve({ data: null, error: null })
      addResult = await addPromise
    })
    expect(addResult.error).toBeNull()
    expect(mounted.read().liked).toBe(true)

    let removePromise!: Promise<{ error: Error | null }>
    flushSync(() => {
      removePromise = mounted.api.toggleLike("garment", "piece-1")
    })
    expect(mounted.read().liked).toBe(false)

    let removeResult!: { error: Error | null }
    await act(async () => {
      mock.holdDelete.resolve({ data: null, error: null })
      removeResult = await removePromise
    })
    expect(removeResult.error).toBeNull()
    expect(mounted.read().liked).toBe(false)
    mounted.unmount()
  })

  it("rolls back likedKeys when supabase insert fails", async () => {
    const mock = mockLikesTable()
    const mounted = mountLikes("user-a", "look", "look-1")
    await settleSelect(mock, mounted.read, { data: [], error: null })

    let addPromise!: Promise<{ error: Error | null }>
    flushSync(() => {
      addPromise = mounted.api.toggleLike("look", "look-1")
    })
    expect(mounted.read().liked).toBe(true)

    let result!: { error: Error | null }
    await act(async () => {
      mock.holdInsert.resolve({ data: null, error: { message: "insert failed" } })
      result = await addPromise
    })

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe("insert failed")
    expect(mounted.read().liked).toBe(false)
    mounted.unmount()
  })

  it("rolls back likedKeys when supabase delete fails", async () => {
    const mock = mockLikesTable()
    const mounted = mountLikes("user-a", "garment", "piece-2")
    await settleSelect(mock, mounted.read, {
      data: [{ target_type: "garment", target_id: "piece-2" }],
      error: null,
    })
    expect(mounted.read().liked).toBe(true)

    let removePromise!: Promise<{ error: Error | null }>
    flushSync(() => {
      removePromise = mounted.api.toggleLike("garment", "piece-2")
    })
    expect(mounted.read().liked).toBe(false)

    let result!: { error: Error | null }
    await act(async () => {
      mock.holdDelete.resolve({ data: null, error: { message: "delete failed" } })
      result = await removePromise
    })

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe("delete failed")
    expect(mounted.read().liked).toBe(true)
    mounted.unmount()
  })

  it("sets loadError when likes select fails and clears on dismiss", async () => {
    const mock = mockLikesTable()
    const mounted = mountLikes("user-a")
    await settleSelect(mock, mounted.read, { data: null, error: { message: "select failed" } })

    expect(mounted.read().error).toBe("select failed")
    expect(mounted.read().size).toBe(0)

    flushSync(() => {
      mounted.api.dismissLoadError()
    })
    expect(mounted.read().error).toBe("")
    mounted.unmount()
  })
})
