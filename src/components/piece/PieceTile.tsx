import { memo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Bookmark, Check, PlusCircle, Trash, TShirt } from "@phosphor-icons/react"
import { SLOT_LABEL, type Piece } from "../../data/catalog"
import { useAuthOptional } from "../../state/auth"
import { useCatalog } from "../../state/catalog"
import { useWardrobe } from "../../state/wardrobe"
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
  const { owns, addToWardrobe, removeFromWardrobe, wear } = useWardrobe()
  const location = useLocation()
  const navigate = useNavigate()
  const from = location.pathname + location.search
  const owned = owns(piece.id)
  const wearMode = action === "wear"
  const [authOpen, setAuthOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

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
                <Icon icon={Bookmark} size="xs" />
                {piece.savedCount}
              </span>
            </span>
            {wearMode ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  className={`grid size-8 place-items-center rounded-full transition-colors duration-150 active:scale-[0.96] ${
                    confirmRemove
                      ? "bg-error text-white"
                      : "text-base-content/50 hover:text-error"
                  }`}
                  title={confirmRemove ? "Confirm remove" : "Remove from wardrobe"}
                  aria-label={
                    confirmRemove
                      ? `Confirm removing ${piece.name} from wardrobe`
                      : `Remove ${piece.name} from wardrobe`
                  }
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (!confirmRemove) {
                      setConfirmRemove(true)
                      return
                    }
                    setConfirmRemove(false)
                    void removeFromWardrobe(piece.id)
                  }}
                  onBlur={() => setConfirmRemove(false)}
                >
                  <Icon icon={confirmRemove ? Check : Trash} size="md" />
                </button>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full text-base-content/70 transition-[color,transform] duration-150 hover:text-primary active:scale-[0.96]"
                  title={`Wear ${piece.name}`}
                  aria-label={`Wear ${piece.name}`}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    wear(piece.id)
                  }}
                >
                  <Icon icon={TShirt} size="md" />
                </button>
              </span>
            ) : owned ? (
              <button
                type="button"
                className={`grid size-11 place-items-center rounded-full transition-colors duration-150 active:scale-[0.96] ${
                  confirmRemove
                    ? "bg-error text-white"
                    : "bg-primary text-primary-content shadow-sm hover:bg-error hover:text-white"
                }`}
                title={confirmRemove ? "Confirm remove" : "In wardrobe — click to remove"}
                aria-label={
                  confirmRemove
                    ? `Confirm removing ${piece.name} from wardrobe`
                    : `Remove ${piece.name} from wardrobe`
                }
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (!confirmRemove) {
                    setConfirmRemove(true)
                    return
                  }
                  setConfirmRemove(false)
                  void removeFromWardrobe(piece.id).then(({ error }) => {
                    if (!error) {
                      upsert({ ...piece, savedCount: Math.max(0, piece.savedCount - 1) })
                    }
                  })
                }}
                onBlur={() => setConfirmRemove(false)}
              >
                <Icon icon={confirmRemove ? Trash : Check} size="xs" />
              </button>
            ) : (
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-base-content/70 transition-[color,transform] duration-150 hover:text-primary active:scale-[0.96]"
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
                <Icon icon={PlusCircle} size="lg" />
              </button>
            )}
          </div>
        </div>
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
})
