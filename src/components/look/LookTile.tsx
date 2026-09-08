import { useNavigate, useLocation, Link } from "react-router-dom"
import { equippedFromStack, piecesFromEquipped } from "../../data/outfit"
import { IsoThumb } from "../iso/IsoThumb"
import { MakerLink } from "../piece/MakerLink"
import { LikeButton } from "../piece/LikeButton"
import type { PublicLook } from "../../state/publicLooks"

export function LookTile({
  look,
  onLikeCountChange,
}: {
  look: PublicLook
  onLikeCountChange?: (newCount: number) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.pathname + location.search
  const outfit = piecesFromEquipped(equippedFromStack(look.stack), look.stack)
  const layerCount = look.stack.length

  function handleTileClick(e: React.MouseEvent) {
    // If clicked inside interactive controls (MakerLink or LikeButton), do not navigate tile
    const target = e.target as HTMLElement | null
    if (target?.closest("a, button, input")) return
    navigate(`/look/${look.id}`, { state: { from } })
  }

  return (
    <div
      onClick={handleTileClick}
      className="piece-tile tile-lift relative cursor-pointer no-underline text-inherit group"
    >
      <IsoThumb
        outfit={outfit}
        bodyId={look.bodyId}
        bodyHue={look.bodyHue}
        model={look.model}
        alt={look.name}
      />
      <div className="relative z-10 min-w-0 bg-neutral px-4 pb-4 pt-3">
        <h3 className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold">
          <Link
            to={`/look/${look.id}`}
            state={{ from }}
            className="text-inherit hover:underline focus:outline-none"
            title={look.name}
          >
            {look.name}
          </Link>
        </h3>
        <p className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-sm font-semibold text-primary">
          <MakerLink username={look.maker} />
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-base-content/70 min-w-0">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-extrabold text-base-content/60">
            <span className="tabular-nums font-bold text-primary">{layerCount}</span> layers
            <span className="opacity-40">·</span>
            <span className="capitalize">{look.model}</span>
          </span>
          <LikeButton
            type="look"
            id={look.id}
            count={look.likeCount}
            onCountChange={onLikeCountChange}
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  )
}
