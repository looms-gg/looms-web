import type { CSSProperties } from "react"
import { Link } from "react-router-dom"
import { faBookmark, faPlus } from "@fortawesome/free-solid-svg-icons"
import type { Piece } from "../../data/catalog"
import { FaIcon } from "../../components/ui/FaIcon"
import { LikeButton } from "../../components/piece/LikeButton"

export function PieceActions({
  piece,
  owned,
  wearing,
  onLikeCountChange,
  onWear,
  onAddToWardrobe,
  onAddAndWear,
}: {
  piece: Piece
  owned: boolean
  wearing: boolean
  onLikeCountChange: (likeCount: number) => void
  onWear: () => void
  onAddToWardrobe: () => void
  onAddAndWear: () => void
}) {
  return (
    <div
      className="piece-reveal flex flex-wrap items-center gap-3"
      style={{ "--piece-i": 4 } as CSSProperties}
    >
      <LikeButton
        type="garment"
        id={piece.id}
        count={piece.likeCount}
        onCountChange={onLikeCountChange}
      />
      <span
        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-base-content/15 bg-base-100 px-3 text-sm font-extrabold tabular-nums text-base-content/70"
        title={`${piece.savedCount} ${piece.savedCount === 1 ? "save" : "saves"}`}
      >
        <FaIcon icon={faBookmark} className="size-3" />
        {piece.savedCount}
        <span className="font-bold text-base-content/45">saved</span>
      </span>
      {owned ? (
        <button
          type="button"
          className="btn btn-primary min-h-11 rounded-full font-extrabold"
          onClick={onWear}
          disabled={wearing}
          title={
            wearing
              ? "This piece is already on your studio character"
              : "Put this piece on your studio character"
          }
        >
          {wearing ? "Wearing" : "Wear in studio"}
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-primary min-h-11 rounded-full font-extrabold"
            onClick={onAddToWardrobe}
          >
            <span className="grid size-5 place-items-center rounded-full bg-primary-content/20">
              <FaIcon icon={faPlus} className="size-2.5" />
            </span>
            Add to wardrobe
          </button>
          <button
            type="button"
            className="btn btn-ghost min-h-11 rounded-full font-bold"
            onClick={onAddAndWear}
          >
            Add & wear
          </button>
        </>
      )}
      {owned ? (
        <Link to="/studio" className="btn btn-ghost min-h-11 rounded-full font-bold">
          Open studio
        </Link>
      ) : null}
    </div>
  )
}
