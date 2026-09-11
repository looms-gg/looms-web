import { X } from "@phosphor-icons/react"
import { Icon } from "./Icon"

/**
 * Chrome-less close control: a bare X glyph that grows its hit area with an
 * invisible pseudo-element instead of the boxed `btn btn-ghost btn-circle`
 * chip. Keep chrome on interactive buttons; close affordances read best raw.
 */
export function CloseButton({
  onClick,
  className = "",
  size = "size-4",
  area = "size-9",
  label = "Close",
}: {
  onClick: () => void
  className?: string
  /** Visual glyph size. */
  size?: string
  /** Invisible hit-area size; pseudo-centered on the glyph. */
  area?: string
  label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative inline-grid place-items-center cursor-pointer text-base-content/60 transition-colors duration-150 hover:text-base-content active:scale-[0.96] after:absolute after:left-1/2 after:top-1/2 ${area} after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] ${className}`}
    >
      <Icon icon={X} className={size} />
    </button>
  )
}
