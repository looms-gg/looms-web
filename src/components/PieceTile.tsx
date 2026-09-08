import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { faBookmark, faCheck, faPlus } from "@fortawesome/free-solid-svg-icons"
import { SLOT_LABEL, type Piece } from "../data/catalog"
import { useAuthOptional } from "../state/auth"
import { useCatalog } from "../state/catalog"
import { useSession } from "../state/closet"
import { AuthModal } from "./AuthModal"
import { FaIcon } from "./FaIcon"
import { IsoThumb } from "./IsoThumb"
import { MakerLink } from "./MakerLink"

export function PieceTile({
  piece,
  action = "catalog",
}: {
  piece: Piece
  action?: "catalog" | "wear"
}) {
  const auth = useAuthOptional()
  const { upsert } = useCatalog()
  const { owns, addToWardrobe } = useSession()
  const location = useLocation()
  const from = location.pathname + location.search
  const owned = owns(piece.id)
  const wearMode = action === "wear"
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      <Link
        to={`/piece/${piece.id}`}
        state={{ from }}
        className="piece-tile tile-lift relative no-underline text-inherit group"
      >
        <IsoThumb piece={piece} alt={piece.name} />
        <div className="relative z-10 min-w-0 bg-neutral px-4 pb-4 pt-3">
          <h3
            className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold"
            title={piece.name}
          >
            {piece.name}
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
                <FaIcon icon={faBookmark} className="size-2.5" />
                {piece.savedCount}
              </span>
            </span>
            {wearMode ? null : owned ? (
              <span
                className="grid size-11 place-items-center rounded-full bg-primary text-primary-content shadow-sm"
                title="In wardrobe"
                aria-label={`${piece.name} in wardrobe`}
              >
                <FaIcon icon={faCheck} className="size-3" />
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
                  addToWardrobe(piece.id).then((added) => {
                    if (added) {
                      upsert({ ...piece, savedCount: piece.savedCount + 1 })
                    }
                  })
                }}
              >
                <FaIcon icon={faPlus} className="size-3" />
              </button>
            )}
          </div>
        </div>
      </Link>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
