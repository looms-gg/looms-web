import { useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { Bookmark, Check, Flag, Link as LinkIcon, Plus, Trash } from "@phosphor-icons/react"
import type { Piece } from "../../data/catalog"
import { Icon } from "../../components/ui/Icon"
import { LikeButton } from "../../components/piece/LikeButton"
import { copyShareLink, getPieceShareUrl } from "../../lib/share"
import { useAuthOptional } from "../../state/auth"
import { AuthModal } from "../../components/auth/AuthModal"
import { ReportModal } from "../../components/moderation/ReportModal"

export function PieceActions({
  piece,
  owned,
  wearing,
  isCreator = false,
  onLikeCountChange,
  onWear,
  onAddToWardrobe,
  onAddAndWear,
  onRemoveFromWardrobe,
}: {
  piece: Piece
  owned: boolean
  wearing: boolean
  isCreator?: boolean
  onLikeCountChange: (likeCount: number) => void
  onWear: () => void
  onAddToWardrobe: () => void
  onAddAndWear: () => void
  onRemoveFromWardrobe: () => void
}) {
  const auth = useAuthOptional()
  const [copied, setCopied] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  async function handleShare() {
    const url = getPieceShareUrl(piece.id)
    const ok = await copyShareLink(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div
      className="piece-reveal flex flex-wrap items-center gap-3"
      style={{ "--piece-i": 4 } as CSSProperties}
    >
      <LikeButton
        type="garment"
        id={piece.id}
        count={piece.likeCount}
        onCountChange={onLikeCountChange} />
      <span
        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-base-content/15 bg-base-100 px-3 text-sm font-extrabold tabular-nums text-base-content/70"
        title={`${piece.savedCount} ${piece.savedCount === 1 ? "save" : "saves"}`}
      >
        <Icon icon={Bookmark} size="xs" />
        {piece.savedCount}
        <span className="font-bold text-base-content/45">saved</span>
      </span>
      <button
        type="button"
        className={`btn ${copied ? "btn-success" : "btn-ghost"} min-h-11 rounded-full font-bold border border-base-content/15`}
        onClick={handleShare}
        title={copied ? "Link copied to clipboard!" : `Share ${piece.name}`}
        aria-label={copied ? "Link copied" : `Share ${piece.name}`}
      >
        <Icon icon={copied ? Check : LinkIcon} size="sm" className="mr-1.5" />
        {copied ? "Copied!" : "Share"}
      </button>
      {owned ? (
        <>
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
          <button
            type="button"
            className={`btn min-h-11 rounded-full font-bold border transition-colors ${
              confirmRemove
                ? "btn-error text-white font-extrabold"
                : "btn-ghost border-base-content/15 text-base-content/60 hover:border-error hover:text-error"
            }`}
            onClick={() => {
              if (!confirmRemove) {
                setConfirmRemove(true)
                return
              }
              setConfirmRemove(false)
              onRemoveFromWardrobe()
            }}
            onBlur={() => setConfirmRemove(false)}
            title={confirmRemove ? "Confirm remove" : "Remove this piece from your wardrobe"}
            aria-label={
              confirmRemove
                ? `Confirm removing ${piece.name} from wardrobe`
                : `Remove ${piece.name} from wardrobe`
            }
          >
            <Icon icon={confirmRemove ? Trash : Check} size="sm" className="mr-1.5" />
            {confirmRemove ? "Confirm remove?" : "Saved"}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-primary min-h-11 rounded-full font-extrabold"
            onClick={onAddToWardrobe}
          >
            <Icon icon={Plus} size="sm" />
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
      {!isCreator ? (
        <button
          type="button"
          className="btn btn-ghost min-h-11 rounded-full font-bold border border-base-content/15 opacity-60 hover:opacity-100"
          onClick={() => {
            if (!auth?.user) {
              setAuthOpen(true)
              return
            }
            setReportOpen(true)
          }}
          title={`Report ${piece.name}`}
          aria-label={`Report ${piece.name}`}
        >
          <Icon icon={Flag} size="sm" className="mr-1.5" />
          Report
        </button>
      ) : null}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      {auth?.user ? (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="piece"
          targetId={piece.id}
          targetLabel={`Piece: ${piece.name}`}
          reporterId={auth.user.id} />
      ) : null}
    </div>
  )
}
