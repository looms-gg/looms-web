import { memo, useState } from "react"
import { Bookmark, Check, PlusCircle, Trash, TShirt } from "@phosphor-icons/react"
import { SLOT_LABEL, type Piece } from "../../data/catalog"
import { useAuthOptional } from "../../state/auth"
import { useCatalog } from "../../state/catalog"
import { useWardrobe } from "../../state/wardrobe"
import { AuthModal } from "../auth/AuthModal"
import { Icon } from "../ui/Icon"
import { IsoThumb } from "../iso/IsoThumb"
import { TileShell } from "./TileShell"

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
  const owned = owns(piece.id)
  const wearMode = action === "wear"
  const [authOpen, setAuthOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <>
      <TileShell
        to={`/piece/${piece.id}`}
        title={piece.name}
        maker={piece.maker}
        media={<IsoThumb piece={piece} alt={piece.name} />}
        meta={
          <>
            <span className="truncate">{SLOT_LABEL[piece.slot]}</span>
            <span
              className="inline-flex shrink-0 items-center gap-1 text-xs font-extrabold tabular-nums text-base-content/55"
              title={`${piece.savedCount} saved`}
            >
              <Icon icon={Bookmark} size="xs" />
              {piece.savedCount}
            </span>
          </>
        }
      >
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
      </TileShell>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
})
