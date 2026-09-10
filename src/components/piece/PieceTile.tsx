import { memo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Bookmark, Check, Plus } from "@phosphor-icons/react"
import { SLOT_LABEL, type Piece } from "../../data/catalog"
import { useAuthOptional } from "../../state/auth"
import { useCatalog } from "../../state/catalog"
import { useCloset } from "../../state/closet"
import { AuthModal } from "../auth/AuthModal"
import { Icon } from "../ui/Icon"
import { IsoThumb } from "../iso/IsoThumb"
import { MakerLink } from "./MakerLink"

export const PieceTile = memo(function PieceTile({
  piece,
  action = "catalog",
}: {
  piece: Piece
  action?: "catalog" | "wear"
}) {
  const auth = useAuthOptional()
  const { upsert } = useCatalog()
  const { owns, addToWardrobe } = useCloset()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.pathname + location.search
  const owned = owns(piece.id)
  const wearMode = action === "wear"
  const [authOpen, setAuthOpen] = useState(false)

  function handleTileClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement | null
    if (target?.closest("a, button, input")) return
    navigate(`/piece/${piece.id}`, { state: { from } })
  }

  return (
    <>
      <div
        onClick={handleTileClick}
        className="piece-tile tile-lift relative cursor-pointer no-underline text-inherit group"
      >
        <Link
          to={`/piece/${piece.id}`}
          state={{ from }}
          tabIndex={-1}
          aria-hidden="true"
          className="block"
        >
          <IsoThumb piece={piece} alt={piece.name} />
        </Link>
        <div className="relative z-10 min-w-0 bg-neutral px-4 pb-4 pt-3">
          <h3 className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold">
            <Link
              to={`/piece/${piece.id}`}
              state={{ from }}
              className="text-inherit hover:underline focus:outline-none"
              title={piece.name}
            >
              {piece.name}
            </Link>
          </h3>
          <p className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-sm font-semibold text-primary">
            <MakerLink username={piece.maker} />
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-base-content/70 min-w-0">
            <span className="inline-flex min-w-0 items-center gap-2 truncate">
              <span className="truncate">{SLOT_LABEL[piece.slot]}</span>
              <span
                className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold tabular-nums text-base-content/55"
                title={`${piece.savedCount} saved`}
              >
                <Icon icon={Bookmark} className="size-2.5" />
                {piece.savedCount}
              </span>
            </span>
            {wearMode ? null : owned ? (
              <span
                className="grid size-11 place-items-center rounded-full bg-primary text-primary-content shadow-sm"
                title="In wardrobe"
                aria-label={`${piece.name} in wardrobe`}
              >
                <Icon icon={Check} className="size-3" />
              </span>
            ) : (
              <button
                type="button"
                className="relative grid size-11 place-items-center rounded-full border border-base-content/20 bg-base-100 text-base-content/80 transition-[background-color,border-color,color,transform] duration-150 after:absolute after:-inset-0 after:content-[''] hover:scale-110 hover:border-primary hover:bg-primary hover:text-primary-content active:scale-[0.96]"
                title="Add to wardrobe"
                aria-label={`Add ${piece.name} to wardrobe`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (!auth?.user) {
                    setAuthOpen(true)
                    return
                  }
                  addToWardrobe(piece.id).then(({ inserted }) => {
                    if (inserted) {
                      upsert({ ...piece, savedCount: piece.savedCount + 1 })
                    }
                  })
                }}
              >
                <Icon icon={Plus} className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
})
