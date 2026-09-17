import { useState, type CSSProperties } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import type { User } from "@supabase/supabase-js"
import { getPiece, type Piece } from "../data/catalog"
import { AuthModal } from "../components/auth/AuthModal"
import { PieceComments } from "../components/piece/PieceComments"
import { EmptyState } from "../components/ui/EmptyState"
import { ButtonLink } from "../components/ui/Button"
import { useWardrobe } from "../state/wardrobe"
import { useCatalog } from "../state/catalog"
import { useAuthOptional } from "../state/auth"
import { HeadMeta } from "../components/shell/HeadMeta"
import {
  creativeWorkJsonLd,
  isThinPieceSeo,
  pieceSeoDescription,
  pieceSeoTitle,
  pieceCanonicalUrl,
  SITE_ORIGIN,
} from "../lib/content/seo"
import { setPendingAction } from "../lib/pendingAction"
import { PieceSheet } from "./piece/PieceSheet"
import { PieceSkeleton } from "./piece/PieceSkeleton"
import { InspectorModal } from "./wardrobe/InspectorModal"
import { UploadInspector } from "./wardrobe/UploadInspector"
import { resolveBackLink, useScrollToTop } from "./detailShared"

function revealStyle(i: number): CSSProperties {
  return { "--piece-i": i } as CSSProperties
}

function PiecePageMeta({ piece }: { piece: Piece }) {
  const shareUrl = pieceCanonicalUrl(piece.id)
  const metaDesc = pieceSeoDescription(piece)
  const isThin = isThinPieceSeo(piece)
  const ogImage = `${SITE_ORIGIN}/og/pieces/${piece.id}.png`

  return (
    <HeadMeta
      title={pieceSeoTitle(piece)}
      description={metaDesc}
      url={shareUrl}
      image={ogImage}
      index={!isThin}
      jsonLd={creativeWorkJsonLd({
        name: piece.name,
        description: metaDesc,
        url: shareUrl,
        image: ogImage,
        genre: `Minecraft ${piece.slot} layer`,
      })}
    />
  )
}

function PieceNotFound({ loading }: { loading: boolean }) {
  if (loading) return <PieceSkeleton />
  return (
    <div className="mx-auto max-w-md py-16">
      <EmptyState
        title="Piece not found"
        body="This piece may have been removed, or the link is wrong."
        action={
          <ButtonLink to="/" variant="primary" className="mt-4 font-extrabold">
            Explore pieces
          </ButtonLink>
        }
      />
    </div>
  )
}

function usePieceWardrobeSync(piece: Piece | undefined, user: User | null) {
  const { owns, addToWardrobe, removeFromWardrobe, wear, addAndWear, equipped } = useWardrobe()
  const { upsert } = useCatalog()
  const [authOpen, setAuthOpen] = useState(false)

  const owned = piece ? owns(piece.id) : false
  const wearing = piece ? equipped[piece.slot] === piece.id : false

  function bumpSaved() {
    if (!piece) return
    const latest = getPiece(piece.id) ?? piece
    upsert({ ...latest, savedCount: latest.savedCount + 1 })
  }

  function dropSaved() {
    if (!piece) return
    const latest = getPiece(piece.id) ?? piece
    upsert({ ...latest, savedCount: Math.max(0, latest.savedCount - 1) })
  }

  function requireAuth(
    pending: { action: "add" | "addAndWear"; pieceId: string },
    action: () => void,
  ) {
    if (!user) {
      setPendingAction(pending)
      setAuthOpen(true)
      return
    }
    action()
  }

  const handleAdd = () => {
    if (!piece) return
    requireAuth({ action: "add", pieceId: piece.id }, () => {
      void addToWardrobe(piece.id).then(({ inserted }) => {
        if (inserted) bumpSaved()
      })
    })
  }

  const handleAddAndWear = () => {
    if (!piece) return
    requireAuth({ action: "addAndWear", pieceId: piece.id }, () => {
      void addAndWear(piece.id).then(({ inserted }) => {
        if (inserted) bumpSaved()
      })
    })
  }

  const handleRemove = () => {
    if (!piece) return
    void removeFromWardrobe(piece.id).then(({ error }) => {
      if (!error) dropSaved()
    })
  }

  return {
    owned,
    wearing,
    authOpen,
    setAuthOpen,
    wearPiece: () => piece && wear(piece.id),
    handleAdd,
    handleAddAndWear,
    handleRemove,
  }
}

export function PiecePage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { loading, upsert } = useCatalog()
  const piece = id ? getPiece(id) : undefined
  const [editing, setEditing] = useState(false)

  const {
    owned,
    wearing,
    authOpen,
    setAuthOpen,
    wearPiece,
    handleAdd,
    handleAddAndWear,
    handleRemove,
  } = usePieceWardrobeSync(piece, user)

  useScrollToTop(location.key, id)

  if (!piece) {
    return <PieceNotFound loading={loading} />
  }

  const { to: backTo, label: backLabel } = resolveBackLink(location.state)
  const isCreator = Boolean(
    user?.id && piece.userId && user.id === piece.userId,
  )

  const leaveAfterDelete = () => {
    setEditing(false)
    const stateFrom = (location.state as { from?: string } | null)?.from
    void navigate(stateFrom || "/wardrobe?tab=uploads", { replace: true })
  }

  return (
    <div className="space-y-4">
      <PiecePageMeta piece={piece} />

      <Link
        to={backTo}
        className="piece-reveal link inline-flex min-h-11 items-center gap-0.5 text-sm font-bold text-base-content/70 no-underline transition-colors duration-150 hover:text-primary"
        style={revealStyle(0)}
      >
        {backLabel}
      </Link>

      <PieceSheet
        piece={piece}
        owned={owned}
        wearing={wearing}
        isCreator={isCreator}
        onEdit={() => setEditing(true)}
        onEditInPainter={() => navigate(`/editor?piece=${piece.id}`)}
        onLikeCountChange={(likeCount) => upsert({ ...piece, likeCount })}
        onWear={wearPiece}
        onAddToWardrobe={handleAdd}
        onAddAndWear={handleAddAndWear}
        onRemoveFromWardrobe={handleRemove}
      />

      <PieceComments
        garmentId={piece.id}
        garmentOwnerId={piece.userId}
        isPublic={piece.isPublic !== false}
      />

      <InspectorModal
        open={editing}
        title={piece.name}
        onClose={() => setEditing(false)}
      >
        <UploadInspector piece={piece} onDeleted={leaveAfterDelete} />
      </InspectorModal>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
