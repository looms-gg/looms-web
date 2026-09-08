import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"

export function FaIcon({
  icon,
  className = "",
}: {
  icon: IconDefinition
  className?: string
}) {
  return (
    <FontAwesomeIcon
      icon={icon}
      className={className}
      aria-hidden
    />
  )
}
