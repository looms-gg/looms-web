import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  type MockQueryResult,
} from "../../test/supabaseMock"
import { DEFAULT_FEATURED_LOOKS } from "../../state/publicLooks"
import { usePublicLooksFeed, type PublicLooksFeed } from "./usePublicLooksFeed"

type Row = Record<string, unknown> & { id: string }

function makeRow(overrides: Partial<Row> & { id: string }): Row {
  return {
    user_id: "u-1",
    name: "Cozy Fit",
    description: "warm layers",
    visibility: "public",
    stack: ["winter-coat"],
    body_id: "slate",
    body_hue: 0,
    model: "classic",
    like_count: 5,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    username: "notch",
    avatar_url: null,
    ...overrides,
  }
}

let feedRows: Row[]
let feedPending: boolean
let trendingRows: Row[]
let trendingError: boolean
let trendingPending: boolean
let yesterdayRows: Row[]
let yesterdayError: boolean

const roots: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = []

function mountFeed() {
  let feed!: PublicLooksFeed
  function HookCatcher() {
    feed = usePublicLooksFeed()
    return null
  }
  const host = document.createElement("div")
  const root = createRoot(host)
  act(() => {
    flushSync(() => {
      root.render(<HookCatcher />)
    })
  })
  roots.push({ root, host })
  return { getFeed: () => feed, unmount: () => act(() => root.unmount()) }
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  feedRows = []
  feedPending = false
  trendingRows = []
  trendingError = false
  trendingPending = false
  yesterdayRows = []
  yesterdayError = false

  const hung = new Promise<MockQueryResult>(() => {})

  const from = mockSupabaseFrom()
  from.setDefaultHandler((query) => {
    throw new Error(`unexpected table in test: ${query.table}`)
  })
  from.on("looks", () => (feedPending ? hung : { data: feedRows, error: null }))

  const rpc = mockSupabaseRpc()
  rpc.setDefaultHandler((call) => {
    throw new Error(`unexpected rpc in test: ${call.fn}`)
  })
  rpc.on("get_trending_looks_past_day", () =>
    trendingPending
      ? hung
      : trendingError
        ? { data: null, error: { message: "boom" } }
        : { data: trendingRows, error: null },
  )
  rpc.on("get_yesterday_top_look", () =>
    yesterdayError
      ? { data: null, error: { message: "boom" } }
      : { data: yesterdayRows, error: null },
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  for (const { root, host } of roots.splice(0)) {
    act(() => {
      root.unmount()
    })
    host.remove()
  }
})

describe("usePublicLooksFeed", () => {
  it("feeds fetched looks, trending rows, and yesterday's top through", async () => {
    feedRows = [makeRow({ id: "look-1" }), makeRow({ id: "look-2" })]
    trendingRows = [
      makeRow({ id: "trend-1", like_count: 9 }),
      makeRow({ id: "trend-2", like_count: 8 }),
      makeRow({ id: "trend-3", like_count: 7 }),
    ]
    yesterdayRows = [makeRow({ id: "look-top", name: "Yesterday's Champ", username: "champ" })]

    const { getFeed } = mountFeed()
    expect(getFeed().looksLoading).toBe(true)

    await settle()

    const feed = getFeed()
    expect(feed.looksError).toBeNull()
    expect(feed.looksLoading).toBe(false)
    expect(feed.looks.map((l) => l.id)).toEqual(["look-1", "look-2"])
    expect(feed.looks[0]).toMatchObject({ maker: "notch", likeCount: 5, model: "classic" })

    expect(feed.trendingLoading).toBe(false)
    expect(feed.trendingLooks.map((l) => l.id)).toEqual(["trend-1", "trend-2", "trend-3"])

    expect(feed.yesterdayTop?.id).toBe("look-top")
    expect(feed.yesterdayTop?.maker).toBe("champ")
  })

  it("rejects a hung feed at the 10s timeout and shows the error state", async () => {
    feedPending = true
    trendingPending = true

    const { getFeed } = mountFeed()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9_999)
    })
    expect(getFeed().looksLoading).toBe(true)
    expect(getFeed().trendingLoading).toBe(true)
    expect(getFeed().looksError).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    const feed = getFeed()
    expect(feed.looksError).toBeTruthy()
    expect(feed.looksLoading).toBe(false)
    expect(feed.trendingLooks).toEqual(DEFAULT_FEATURED_LOOKS)
    expect(feed.trendingLoading).toBe(false)
    expect(feed.yesterdayTop).toBeNull()
  })

  it("falls back to the featured looks when the trending RPC fails and the feed is empty", async () => {
    trendingError = true

    const { getFeed } = mountFeed()
    await settle()

    const feed = getFeed()
    expect(feed.trendingLoading).toBe(false)
    expect(feed.trendingLooks).toEqual(DEFAULT_FEATURED_LOOKS)
    expect(feed.looks).toEqual([])
    expect(feed.looksLoading).toBe(false)
  })

  it("renders an empty grid without an error when the feed resolves empty", async () => {
    const { getFeed } = mountFeed()
    await settle()

    const feed = getFeed()
    expect(feed.looks).toEqual([])
    expect(feed.looksLoading).toBe(false)
    expect(feed.looksError).toBeNull()
  })

  it("bumpLookLikeCount updates the like count for that look only", async () => {
    feedRows = [makeRow({ id: "look-1" }), makeRow({ id: "look-2" })]

    const { getFeed } = mountFeed()
    await settle()

    act(() => {
      getFeed().bumpLookLikeCount("look-1", 99)
    })

    const feed = getFeed()
    expect(feed.looks[0].likeCount).toBe(99)
    expect(feed.looks[1].likeCount).toBe(5)
  })
})
