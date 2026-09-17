import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

export type HoverTipSide = "top" | "bottom" | "left" | "right"

// Instant hover tooltip: appears with no delay (native titles lag about a
// second). Portaled to document.body with fixed positioning so overflow
// containers (the options bar scrolls horizontally) and stacking contexts
// never clip it or bury it under sibling z-indexes.
export function HoverTip({
  tip,
  side = "bottom",
  visible = true,
  className = "",
  children,
}: {
  tip: string
  side?: HoverTipSide
  visible?: boolean
  className?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement | null>(null)

  const updatePos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const GAP = 6
    if (side === "bottom") {
      setPos({ top: rect.bottom + GAP, left: rect.left + rect.width / 2 })
    } else if (side === "top") {
      setPos({ top: rect.top - GAP, left: rect.left + rect.width / 2 })
    } else if (side === "left") {
      setPos({ top: rect.top + rect.height / 2, left: rect.left - GAP })
    } else {
      setPos({ top: rect.top + rect.height / 2, left: rect.right + GAP })
    }
  }, [side])

  const show = useCallback(() => {
    updatePos()
    setOpen(true)
  }, [updatePos])

  // A scrolled or resized page makes a fixed tooltip stale; closing is the
  // cheapest way to stay correct.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open])

  return (
    <span
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open &&
        visible &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[90] w-max max-w-56 rounded-md bg-base-content px-2 py-1 text-center text-[11px] font-semibold leading-snug text-base-100 shadow-lg select-none"
            style={{
              top: pos.top,
              left: pos.left,
              transform:
                side === "top"
                  ? "translate(-50%, -100%)"
                  : side === "bottom"
                    ? "translateX(-50%)"
                    : side === "left"
                      ? "translate(-100%, -50%)"
                      : "translateY(-50%)",
            }}
          >
            {tip}
          </span>,
          document.body,
        )}
    </span>
  )
}

