import { useState } from "react"
import { Bookmark, Trash } from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"

export function SaveButton({
  name,
  count,
  owned,
  onAdd,
  onRemove,
  className = "",
}: {
  name: string
  count: number
  owned: boolean
  onAdd: () => void
  onRemove: () => void
  className?: string
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const displayCount = Math.max(0, count)

  return (
    <button
      type="button"
      className={`btn h-11 min-h-11 gap-1.5 px-2.5 font-extrabold ${
        confirmRemove
          ? "btn-error text-white"
          : owned
            ? "bg-base-300 text-primary hover:text-secondary"
            : "bg-base-300 text-base-content/80 hover:text-primary"
      } ${className}`}
      aria-pressed={owned}
      aria-label={
        confirmRemove
          ? `Confirm removing ${name} from wardrobe`
          : owned
            ? `Remove ${name} from wardrobe`
            : `Add ${name} to wardrobe`
      }
      title={
        confirmRemove
          ? "Confirm remove"
          : owned
            ? "In wardrobe (click to remove)"
            : "Add to wardrobe"
      }
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!owned) {
          onAdd()
          return
        }
        if (!confirmRemove) {
          setConfirmRemove(true)
          return
        }
        setConfirmRemove(false)
        onRemove()
      }}
      onBlur={() => setConfirmRemove(false)}
    >
      <Icon icon={confirmRemove ? Trash : Bookmark} size="xs" className="shrink-0" />
      {confirmRemove ? (
        <span className="whitespace-nowrap text-xs font-extrabold">
          Confirm remove?
        </span>
      ) : (
        <span className="min-w-[1ch] text-xs font-extrabold tabular-nums">
          {displayCount}
        </span>
      )}
    </button>
  )
}
