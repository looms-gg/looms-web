import type { Icon as PhosphorIcon } from "@phosphor-icons/react"

/** Any Phosphor icon component (e.g. `Pants`, `Sparkle`, `TShirt`). */
export type IconType = PhosphorIcon

export function Icon({
  icon: Glyph,
  className = "",
}: {
  icon: IconType
  className?: string
}) {
  return <Glyph className={className} aria-hidden />
}
