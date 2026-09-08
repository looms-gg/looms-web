import type { ReactNode } from "react"

export const RACK_GRID_CLASS =
  "rack-grid grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"

export function RackGrid({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`${RACK_GRID_CLASS}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  )
}
