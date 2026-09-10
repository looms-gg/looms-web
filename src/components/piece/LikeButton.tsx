import { useEffect, useState } from "react"
import { Heart } from "@phosphor-icons/react"
import { AuthModal } from "../auth/AuthModal"
import { Icon } from "../ui/Icon"
import { formatErrorMessage } from "../../lib/errorFormat"
import { useAuthOptional } from "../../state/auth"
import { useLikesOptional, type LikeTargetType } from "../../state/likes"

export function LikeButton({
  type,
  id,
  count = 0,
  onCountChange,
  className = "",
}: {
  type: LikeTargetType
  id: string
  count?: number
  onCountChange?: (next: number) => void
  className?: string
}) {
  const auth = useAuthOptional()
  const likes = useLikesOptional()
  const [authOpen, setAuthOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(Math.max(0, count))
  const liked = likes?.isLiked(type, id) ?? false

  useEffect(() => {
    setDisplayCount(Math.max(0, count))
  }, [count])

  return (
    <>
      <button
        type="button"
        className={`relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-base-content/20 bg-base-100 px-2.5 transition-[background-color,border-color,color,transform] duration-150 after:absolute after:-inset-0 after:content-[''] hover:scale-110 active:scale-[0.96] ${
          liked
            ? "border-secondary text-secondary"
            : "text-base-content/80 hover:border-secondary hover:text-secondary"
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
            const next = wasLiked
              ? Math.max(0, displayCount - 1)
              : displayCount + 1
            setDisplayCount(next)
            onCountChange?.(next)
            if (wasLiked) btn.blur()
          })
        }}
      >
        <Icon icon={Heart} className="size-3 shrink-0" />
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
