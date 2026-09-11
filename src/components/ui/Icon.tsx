import {
  Check,
  Link,
  Plus,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react"

/** Any Phosphor icon component (e.g. `Pants`, `Sparkle`, `TShirt`). */
export type IconType = PhosphorIcon

/**
 * App-wide icon size scale. Everything on screen should use one of these;
 * ad-hoc `size-*` classes drift apart visually.
 */
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZE_CLASSES: Record<IconSize, string> = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
  xl: "size-8",
}

/**
 * Bare utility glyphs whose `fill` variant draws a solid BOX around the
 * mark (Phosphor's filled toggle language). They render as heavy bare
 * strokes instead so a checkmark stays a checkmark, not a checkbox.
 */
const BARE_GLYPHS: Set<IconType> = new Set([Check, Link, Plus, X])

export function Icon({
  icon: Glyph,
  size = "sm",
  className = "",
}: {
  icon: IconType
  /** Named size from the app scale; overrides any `size-*` in className. */
  size?: IconSize
  className?: string
}) {
  return (
    <Glyph
      weight={BARE_GLYPHS.has(Glyph) ? "bold" : "fill"}
      className={`${SIZE_CLASSES[size]} ${className}`}
      aria-hidden />
  )
}
