import type { CSSProperties } from "react"

/**
 * Shared skeleton primitive. One tone, one pulse, one source of stagger.
 * Pass `pulse={false}` for calm static placeholders (teasers, previews).
 */
export function Bone({
  className = "",
  rounded = "",
  delay = 0,
  pulse = true,
  style,
}: {
  className?: string
  rounded?: string
  delay?: number
  pulse?: boolean
  style?: CSSProperties
}) {
  return (
    <div
      aria-hidden
      className={`profile-bone ${pulse ? "" : "profile-bone--static"} ${rounded} ${className}`}
      style={{ "--i": delay, ...style } as CSSProperties}
    />
  )
}
