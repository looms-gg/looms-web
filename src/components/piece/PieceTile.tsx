import { memo, useState } from "react"
import { Bookmark, Check, Plus, Trash, TShirt } from "@phosphor-icons/react"
import { SLOT_BADGE_COLOR, SLOT_LABEL, type Piece } from "../../data/catalog"
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
        badge={{
          text: SLOT_LABEL[piece.slot],
          color: SLOT_BADGE_COLOR[piece.slot],
        }}
        meta={
          <>
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
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              className={`grid size-7 sm:size-8 place-items-center rounded-[6px] border-2 border-tactile-outline transition-all active:translate-y-[1px] ${
                confirmRemove
                  ? "bg-error text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                  : "bg-base-300 text-base-content/70 hover:bg-error hover:text-white"
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
              <Icon icon={confirmRemove ? Check : Trash} size="sm" />
            </button>
            <button
              type="button"
              className="grid size-7 sm:size-8 place-items-center rounded-[6px] border-2 border-tactile-outline bg-base-300 text-base-content/80 transition-all hover:bg-primary hover:text-white active:translate-y-[1px]"
              title={`Wear ${piece.name}`}
              aria-label={`Wear ${piece.name}`}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                wear(piece.id)
              }}
            >
              <Icon icon={TShirt} size="sm" />
            </button>
          </span>
        ) : owned ? (
          <button
            type="button"
            className={`grid size-7 sm:size-8 place-items-center rounded-[6px] border-2 border-tactile-outline transition-all active:translate-y-[1px] ${
              confirmRemove
                ? "bg-error text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"
                : "bg-primary/25 text-primary hover:bg-error hover:text-white"
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
            <Icon icon={confirmRemove ? Trash : Check} size="sm" />
          </button>
        ) : (
          <button
            type="button"
            className="grid size-7 sm:size-8 place-items-center rounded-[6px] border-2 border-tactile-outline bg-base-300 text-base-content/80 transition-all hover:bg-primary hover:text-white active:translate-y-[1px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1.5px_0_rgba(0,0,0,0.3)]"
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
            <Icon icon={Plus} size="sm" />
          </button>
        )}
      </TileShell>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
})
