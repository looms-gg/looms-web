import { useState, type CSSProperties } from "react"
import { Check, Flag, Link as LinkIcon, Plus } from "@phosphor-icons/react"
import type { Piece } from "../../data/catalog"
import { Icon } from "../../components/ui/Icon"
import { Button } from "../../components/ui/Button"
import { LikeButton } from "../../components/piece/LikeButton"
import { SaveButton } from "../../components/piece/SaveButton"
import { copyShareLink, getPieceShareUrl } from "../../lib/content/share"
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
      <SaveButton
        name={piece.name}
        count={piece.savedCount}
        owned={owned}
        onAdd={onAddToWardrobe}
        onRemove={onRemoveFromWardrobe} />
      {owned ? (
        <>
          <Button
            variant="primary"
            className="min-h-11 font-extrabold"
            onClick={onWear}
            disabled={wearing}
            title={
              wearing
                ? "This piece is already on your studio character"
                : "Put this piece on your studio character"
            }
          >
            {wearing ? "Wearing" : "Wear in studio"}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="primary"
            className="min-h-11 font-extrabold"
            onClick={onAddToWardrobe}
            icon={Plus}
          >
            Add to wardrobe
          </Button>
          <Button variant="ghost" className="min-h-11 font-bold" onClick={onAddAndWear}>
            Add & wear
          </Button>
        </>
      )}
      <Button
        variant={copied ? "success" : "ghost"}
        className="min-h-11 font-bold border border-base-content/15"
        onClick={handleShare}
        title={copied ? "Link copied to clipboard!" : `Share ${piece.name}`}
        aria-label={copied ? "Link copied" : `Share ${piece.name}`}
      >
        <Icon icon={copied ? Check : LinkIcon} size="sm" className="mr-1.5" />
        {copied ? "Copied!" : "Share"}
      </Button>
      {!isCreator ? (
        <Button
          variant="ghost"
          className="min-h-11 font-bold border border-base-content/15 opacity-60 hover:opacity-100"
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
        </Button>
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
