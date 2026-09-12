import type { ReactNode } from "react"

export function EmptyState({
  title,
  body,
  action,
  className = "",
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-12 text-center ${className}`}
    >
      <p className="text-lg font-extrabold">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-base-content/65">{body}</p> : null}
      {action}
    </div>
  )
}
