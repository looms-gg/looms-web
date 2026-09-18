import type { CSSProperties, ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { MakerLink } from "./MakerLink"

/** Shared badge for look tiles so every surface shows the same sliver. */
export const LOOK_BADGE = { text: "Look", color: "#c2c9d4" } as const

/**
 * Shared shell for catalog tiles (pieces and looks): the media link, the
 * weight-first title/maker caption, and a footer row for per-tile meta and
 * actions. Keeps every tile type structurally identical. `badge` overlays a
 * fading gradient sliver on the media.
 */
export function TileShell({
  to,
  title,
  maker,
  meta,
  media,
  badge,
  children,
}: {
  to: string
  title: string
  maker?: string
  meta: ReactNode
  media: ReactNode
  badge?: { text: string; color: string }
  children?: ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.pathname + location.search

  function handleTileClick(event: React.MouseEvent) {
    const target = event.target as HTMLElement | null
    if (target?.closest("a, button, input")) return
    navigate(to, { state: { from } })
  }

  const badgeNode = badge ? (
    <span
      aria-hidden="true"
      className="tile-badge"
      style={{ "--badge-color": badge.color } as CSSProperties}
    >
      <span className="tile-badge-text">{badge.text}</span>
    </span>
  ) : null

  return (
    <div
      onClick={handleTileClick}
      className="piece-tile tile-lift relative cursor-pointer no-underline text-inherit group"
    >
      <Link to={to} state={{ from }} tabIndex={-1} aria-hidden="true" className="relative block flex-1 flex flex-col">
        {media}
        {badgeNode}
      </Link>
      <div className="relative z-10 mt-auto min-w-0 bg-base-200/95 px-3 py-2.5 sm:px-3.5 border-t-2 border-tactile-outline shadow-[inset_0_1px_0_0_var(--tactile-inner-frame)]">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm font-bold text-base-content leading-tight">
              <Link
                to={to}
                state={{ from }}
                className="text-inherit hover:underline focus:outline-none"
                title={title}
              >
                {title}
              </Link>
            </h3>
            {maker ? (
              <p className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-[11px] font-semibold text-base-content/65 leading-tight mt-0.5">
                <MakerLink username={maker} />
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span aria-hidden="true" className="text-base-content/40 font-normal select-none text-xs">|</span>
            <div className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-base-content/65 tabular-nums">
              {meta}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
