import { useEffect } from "react"

export function useScrollToTop(key: string, id: string | undefined) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" })
      } catch {
        try {
          window.scrollTo(0, 0)
        } catch {
          // ignore
        }
      }
      if (document.documentElement) document.documentElement.scrollTop = 0
      if (document.body) document.body.scrollTop = 0
    }
  }, [id, key])
}

/**
 * Back link for detail pages that can be reached from Explore, the Wardrobe,
 * or a profile. The origin page passes `location.state.from`; anything else
 * falls back to Explore.
 */
export function resolveBackLink(locationState: unknown): { to: string; label: string } {
  const stateFrom = (locationState as { from?: string } | null)?.from
  const to = stateFrom || "/"
  if (stateFrom?.startsWith("/wardrobe")) {
    return { to, label: "← Wardrobe" }
  }
  if (stateFrom?.startsWith("/u/")) {
    return { to, label: "← Profile" }
  }
  return { to, label: "← Explore" }
}
