import {
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

const EXIT_MS = 160

type Phase = "closed" | "open" | "exiting"

// Body scroll locking is reference-counted: each overlay saves the body's
// inline overflow once for the whole stack and only the last overlay to close
// restores it. Per-instance save/restore breaks with stacked overlays — the
// second overlay captures "hidden" as the previous value and the body stays
// scroll-locked after every overlay is gone.
let openOverlayCount = 0
let savedBodyOverflow: string | null = null

function lockBodyScroll() {
  if (openOverlayCount === 0) {
    savedBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
  }
  openOverlayCount += 1
}

function unlockBodyScroll() {
  if (openOverlayCount === 0) return
  openOverlayCount -= 1
  if (openOverlayCount === 0 && savedBodyOverflow !== null) {
    document.body.style.overflow = savedBodyOverflow
    savedBodyOverflow = null
  }
}

export function ModalOverlay({
  open,
  onClose,
  dismissible = true,
  labelledBy,
  label,
  portal = false,
  scrimClassName = "modal-scrim",
  panelClassName,
  children,
}: {
  open: boolean
  onClose?: () => void
  dismissible?: boolean
  labelledBy?: string
  label?: string
  portal?: boolean
  scrimClassName?: string
  panelClassName?: string
  children: ReactNode
}) {
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed")

  if (open && phase !== "open") {
    setPhase("open")
  } else if (!open && phase === "open") {
    setPhase("exiting")
  }

  useEffect(() => {
    if (phase !== "exiting") return
    const timer = window.setTimeout(() => setPhase("closed"), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== "open") return
    lockBodyScroll()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      unlockBodyScroll()
      window.removeEventListener("keydown", onKey)
    }
  }, [dismissible, onClose, phase])

  const [entered, setEntered] = useState(false)
  useEffect(() => {
    if (phase !== "open") {
      setEntered(false)
      return
    }
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setEntered(true))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [phase])

  if (phase === "closed") return null

  const visible = phase === "open" && entered

  function onScrimClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && dismissible) onClose?.()
  }

  const node = (
    <div
      className={`${scrimClassName}${visible ? " is-open" : ""}`}
      onClick={onScrimClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  )

  return portal ? createPortal(node, document.body) : node
}
