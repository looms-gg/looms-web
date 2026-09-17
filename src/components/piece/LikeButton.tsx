import { useState } from "react"
import { Heart } from "@phosphor-icons/react"
import { AuthModal } from "../auth/AuthModal"
import { Icon } from "../ui/Icon"
import { formatErrorMessage } from "../../lib/errorFormat"
import { useAuthOptional } from "../../state/auth"
import { useLikesOptional } from "../../state/likes"
import type { LikeTargetType } from "../../data/likeTarget"

export function LikeButton({
  type,
  id,
  count = 0,
  onCountChange,
  className = "",
  size = "md",
}: {
  type: LikeTargetType
  id: string
  count?: number
  onCountChange?: (next: number) => void
  className?: string
  size?: "sm" | "md"
}) {
  const auth = useAuthOptional()
  const likes = useLikesOptional()
  const [authOpen, setAuthOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(Math.max(0, count))
  const [prevCount, setPrevCount] = useState(count)

  if (count !== prevCount) {
    setPrevCount(count)
    setDisplayCount(Math.max(0, count))
  }

  const liked = likes?.isLiked(type, id) ?? false

  return (
    <>
      <button
        type="button"
        className={`btn ${
          size === "sm" ? "h-7 min-h-7 gap-1 px-2 text-xs font-bold" : "h-10 min-h-10 gap-1.5 px-3 text-sm font-bold"
        } ${
          liked
            ? "bg-secondary/20 text-secondary"
            : "bg-base-300 text-base-content/80 hover:text-secondary"
        } ${className}`}
        aria-pressed={liked}
        aria-label={
          liked
            ? `Unlike (${displayCount} ${displayCount === 1 ? "like" : "likes"})`
            : `Like (${displayCount} ${displayCount === 1 ? "like" : "likes"})`
        }
        title={liked ? "Unlike" : "Like"}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setErrorMsg(null)
          if (!auth?.user) {
            setAuthOpen(true)
            return
          }
          if (!likes) return
          const btn = event.currentTarget
          const wasLiked = liked
          void likes.toggleLike(type, id).then(({ error }) => {
            if (error) {
              setErrorMsg(formatErrorMessage(error))
              return
            }
            // Derive from the latest displayCount, not the click-time
            // snapshot: rapid re-clicks re-read current state in the .then.
            setDisplayCount((current) => {
              const next = wasLiked
                ? Math.max(0, current - 1)
                : current + 1
              onCountChange?.(next)
              return next
            })
            if (wasLiked) btn.blur()
          })
        }}
      >
        <Icon icon={Heart} size="xs" className="shrink-0" />
        <span className="min-w-[1ch] text-xs font-extrabold tabular-nums">
          {displayCount}
        </span>
      </button>
      {errorMsg ? (
        <span className="sr-only" role="status">
          {errorMsg}
        </span>
      ) : null}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
