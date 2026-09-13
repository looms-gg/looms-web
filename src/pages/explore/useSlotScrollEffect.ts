import { useLayoutEffect, useRef } from "react"
import type { SlotFilter } from "../../lib/exploreBrowse"

const RESULTS_TOP_OFFSET = 88

export function useSlotScrollEffect(
  slot: SlotFilter,
  resultsRef: React.RefObject<HTMLDivElement | null>,
) {
  const lastSlot = useRef(slot)

  useLayoutEffect(() => {
    if (lastSlot.current === slot) return
    lastSlot.current = slot
    const grid = resultsRef.current
    if (!grid) return
    const top = grid.getBoundingClientRect().top + window.scrollY - RESULTS_TOP_OFFSET
    if (top > 0 && window.scrollY > top) {
      window.scrollTo({
        top,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      })
    }
  }, [slot, resultsRef])
}
