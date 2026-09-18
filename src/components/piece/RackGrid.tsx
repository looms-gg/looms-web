import type { ReactNode } from "react"

// Literal class strings only: Tailwind scans source text, so interpolated
// class names would never be generated.
const GRID_CLASSES = {
  4: "rack-grid grid content-start grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4",
  5: "rack-grid grid content-start grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5",
} as const

export function RACK_GRID_CLASS(cols: 4 | 5 = 4) {
  return GRID_CLASSES[cols]
}

export function RackGrid({
  children,
  className = "",
  cols = 4,
}: {
  children: ReactNode
  className?: string
  cols?: 4 | 5
}) {
  return (
    <div className={`${RACK_GRID_CLASS(cols)}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  )
}
