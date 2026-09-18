import type { ReactNode } from "react"
import { Icon, type IconType } from "./Icon"

export function EmptyState({
  title,
  body,
  action,
  icon,
  className = "",
}: {
  title: string
  body?: ReactNode
  action?: ReactNode
  icon?: IconType
  className?: string
}) {
  return (
    <div className={`empty-state ${className}`}>
      {icon ? (
        <span className="empty-state-icon">
          <Icon icon={icon} size="lg" />
        </span>
      ) : null}
      <p className="empty-state-title">{title}</p>
      {body ? <p className="empty-state-body">{body}</p> : null}
      {action}
    </div>
  )
}
