import loomIcon from "../assets/looms-icon.png"
import loomWordmark from "../assets/looms-workmark.png"
import loomsFull from "../assets/looms-full.png"

const MARKS = {
  full: { src: loomsFull, width: 1422, height: 504 },
  wordmark: { src: loomWordmark, width: 1022, height: 504 },
  icon: { src: loomIcon, width: 474, height: 523 },
} as const

export type LoomsLogoVariant = keyof typeof MARKS

export function LoomsLogo({
  className = "h-9",
  decorative = false,
  variant = "full",
}: {
  className?: string
  decorative?: boolean
  variant?: LoomsLogoVariant
}) {
  const mark = MARKS[variant]
  return (
    <img
      src={mark.src}
      width={mark.width}
      height={mark.height}
      alt={decorative ? "" : "looms"}
      className={`looms-wordmark w-auto select-none ${className}`}
      draggable={false}
    />
  )
}
