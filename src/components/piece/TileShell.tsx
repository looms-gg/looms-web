import type { ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { MakerLink } from "./MakerLink"

/**
 * Shared shell for catalog tiles (pieces and looks): the media link, the
 * weight-first title/maker caption, and a footer row for per-tile meta and
 * actions. Keeps both tile types structurally identical.
 */
export function TileShell({
  to,
  title,
  maker,
  meta,
  media,
  children,
}: {
  to: string
  title: string
  maker: string
  meta: ReactNode
  media: ReactNode
  children: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.pathname + location.search

  function handleTileClick(event: React.MouseEvent) {
    const target = event.target as HTMLElement | null
    if (target?.closest("a, button, input")) return
    navigate(to, { state: { from } })
  }

  return (
    <div
      onClick={handleTileClick}
      className="piece-tile tile-lift relative cursor-pointer no-underline text-inherit group"
    >
      <Link to={to} state={{ from }} tabIndex={-1} aria-hidden="true" className="block">
        {media}
      </Link>
      <div className="relative z-10 min-w-0 bg-neutral px-4 pb-4 pt-3">
        <h3 className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold">
          <Link
            to={to}
            state={{ from }}
            className="text-inherit hover:underline focus:outline-none"
            title={title}
          >
            {title}
          </Link>
        </h3>
        <p className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-sm font-semibold text-primary">
          <MakerLink username={maker} />
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-base-content/70 min-w-0">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">{meta}</span>
          {children}
        </div>
      </div>
    </div>
  )
}
