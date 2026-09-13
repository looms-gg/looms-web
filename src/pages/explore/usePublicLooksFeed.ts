import { useCallback, useEffect, useState } from "react"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  DEFAULT_FEATURED_LOOKS,
  fetchPublicLooksFeed,
  fetchTrendingLooksPastDay,
  fetchYesterdayTopLook,
  type PublicLook,
} from "../../state/publicLooks"

/** Never let a hung request pin the hero or the grid on skeletons forever. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

export type PublicLooksFeed = {
  looks: PublicLook[]
  looksLoading: boolean
  looksError: string | null
  trendingLooks: PublicLook[]
  trendingLoading: boolean
  yesterdayTop: PublicLook | null
  bumpLookLikeCount: (lookId: string, nextCount: number) => void
}

/** Feed, trending, and yesterday's-top state for the Explore hero and grid. */
export function usePublicLooksFeed(): PublicLooksFeed {
  const [looks, setLooks] = useState<PublicLook[]>([])
  const [looksLoading, setLooksLoading] = useState(true)
  const [looksError, setLooksError] = useState<string | null>(null)
  const [trendingLooks, setTrendingLooks] = useState<PublicLook[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [yesterdayTop, setYesterdayTop] = useState<PublicLook | null>(null)

  useEffect(() => {
    let active = true
    setTrendingLoading(true)
    void withTimeout(fetchTrendingLooksPastDay(3), 10_000)
      .then((res) => {
        if (active) {
          if (res.length >= 3) {
            setTrendingLooks(res)
          } else {
            setTrendingLooks(DEFAULT_FEATURED_LOOKS)
          }
          setTrendingLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setTrendingLooks(DEFAULT_FEATURED_LOOKS)
          setTrendingLoading(false)
        }
      })
    // fetchPublicLooksFeed never rejects; the timeout supplies the failure
    // branch so a hung request cannot pin the grid on skeletons forever.
    void withTimeout(fetchPublicLooksFeed(), 10_000)
      .then((res) => {
        if (active) {
          setLooks(res)
          setLooksLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setLooksError(formatErrorMessage(err))
          setLooksLoading(false)
        }
      })
    void fetchYesterdayTopLook().then((top) => {
      if (active) setYesterdayTop(top)
    })
    return () => {
      active = false
    }
  }, [])

  const bumpLookLikeCount = useCallback((lookId: string, nextCount: number) => {
    setLooks((prev) =>
      prev.map((l) => (l.id === lookId ? { ...l, likeCount: nextCount } : l)),
    )
  }, [])

  return {
    looks,
    looksLoading,
    looksError,
    trendingLooks,
    trendingLoading,
    yesterdayTop,
    bumpLookLikeCount,
  }
}
