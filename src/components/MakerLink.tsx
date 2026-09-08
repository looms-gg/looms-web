import { Link } from "react-router-dom"

export function MakerLink({
  username,
  className = "text-primary font-semibold",
  prefix = "by ",
}: {
  username: string
  className?: string
  prefix?: string
}) {
  return (
    <Link
      to={`/u/${encodeURIComponent(username)}`}
      className={`min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis no-underline hover:underline ${className}`}
      title={username}
      onClick={(event) => event.stopPropagation()}
    >
      {prefix}
      {username}
    </Link>
  )
}
