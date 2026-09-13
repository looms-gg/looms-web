import { useEffect, useState, type CSSProperties } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { getPiece } from "../data/catalog"
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
} from "../lib/seo"
import { setPendingAction } from "../lib/pendingAction"
import { PieceSheet } from "./piece/PieceSheet"
import { PieceSkeleton } from "./piece/PieceSkeleton"
import { InspectorModal } from "./wardrobe/InspectorModal"
import { UploadInspector } from "./wardrobe/UploadInspector"

function revealStyle(i: number): CSSProperties {
  return { "--piece-i": i } as CSSProperties
}

export function PiecePage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { loading, upsert } = useCatalog()
  const piece = id ? getPiece(id) : undefined
  const { owns, addToWardrobe, removeFromWardrobe, wear, addAndWear, equipped } = useWardrobe()
  const [editing, setEditing] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
function resolvePieceBackLink(locationState: unknown): { to: string; label: string } {
  const stateFrom = (locationState as { from?: string } | null)?.from
  const to = stateFrom || "/"
  const label = stateFrom?.startsWith("/wardrobe") ? "← Wardrobe" : "← Explore"
  return { to, label }
}

function useScrollToTop(key: string, id: string | undefined) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" })
      } catch {
        try {
          window.scrollTo(0, 0)
        } catch {
          /* ignore */
        }
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
      }
      if (document.documentElement) document.documentElement.scrollTop = 0
      if (document.body) document.body.scrollTop = 0
    }
  }, [id, location.key])
  }, [id, key])
}

  const stateFrom = (location.state as { from?: string } | null)?.from
  const backTo = stateFrom || "/"
  const backLabel = stateFrom?.startsWith("/wardrobe") ? "← Wardrobe" : "← Explore"
function PiecePageMeta({ piece }: { piece: Piece }) {
  const shareUrl = pieceCanonicalUrl(piece.id)
  const metaDesc = pieceSeoDescription(piece)
  const isThin = isThinPieceSeo(piece)
  const ogImage = `${SITE_ORIGIN}/og/pieces/${piece.id}.png`

  if (!piece) {
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

  const currentPiece = piece
  const owned = owns(currentPiece.id)
  const wearing = equipped[currentPiece.slot] === currentPiece.id
  const isCreator = Boolean(
    user?.id && currentPiece.userId && user.id === currentPiece.userId,
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

  function leaveAfterDelete() {
    setEditing(false)
    void navigate(stateFrom || "/wardrobe?tab=uploads", { replace: true })
  }
function usePieceWardrobeSync(piece: Piece | undefined, user: User | null) {
  const { owns, addToWardrobe, removeFromWardrobe, wear, addAndWear, equipped } = useWardrobe()
  const { upsert } = useCatalog()
  const [authOpen, setAuthOpen] = useState(false)

  const owned = piece ? owns(piece.id) : false
  const wearing = piece ? equipped[piece.slot] === piece.id : false

  function bumpSaved() {
    const latest = getPiece(currentPiece.id) ?? currentPiece
    if (!piece) return
    const latest = getPiece(piece.id) ?? piece
    upsert({ ...latest, savedCount: latest.savedCount + 1 })
  }

  function dropSaved() {
    const latest = getPiece(currentPiece.id) ?? currentPiece
    if (!piece) return
    const latest = getPiece(piece.id) ?? piece
    upsert({ ...latest, savedCount: Math.max(0, latest.savedCount - 1) })
  }

  function requireAuth(
    pending: { action: "add" | "addAndWear"; pieceId: string },
    action: () => void,
  ) {
    if (!user) {
      // Remember the intent so it replays once the account is confirmed.
      setPendingAction(pending)
      setAuthOpen(true)
      return
    }
    action()
  }

  const shareUrl = pieceCanonicalUrl(currentPiece.id)
  const metaDesc = pieceSeoDescription(currentPiece)
  // Indexation quality gate: uploads without a description are thin content —
  // keep them crawlable for link discovery but out of the index.
  const isThin = isThinPieceSeo(currentPiece)
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

  const { to: backTo, label: backLabel } = resolvePieceBackLink(location.state)
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
      <HeadMeta
        title={pieceSeoTitle(currentPiece)}
        description={metaDesc}
        url={shareUrl}
        image={`https://looms.gg/og/pieces/${currentPiece.id}.png`}
        index={!isThin}
        jsonLd={creativeWorkJsonLd({
          name: currentPiece.name,
          description: metaDesc,
          url: shareUrl,
          image: `https://looms.gg/og/pieces/${currentPiece.id}.png`,
          genre: `Minecraft ${currentPiece.slot} layer`,
        })}
      />
      <PiecePageMeta piece={piece} />

      <Link
        to={backTo}
        className="piece-reveal link inline-flex min-h-11 items-center text-sm font-bold text-primary no-underline"
        style={revealStyle(0)}
      >
        {backLabel}
      </Link>

      <PieceSheet
        piece={currentPiece}
        piece={piece}
        owned={owned}
        wearing={wearing}
        isCreator={isCreator}
        onEdit={() => setEditing(true)}
        onLikeCountChange={(likeCount) => upsert({ ...currentPiece, likeCount })}
        onWear={() => wear(currentPiece.id)}
        onAddToWardrobe={() =>
          requireAuth({ action: "add", pieceId: currentPiece.id }, () => {
            void addToWardrobe(currentPiece.id).then(({ inserted }) => {
              if (inserted) bumpSaved()
            })
          })
        }
        onAddAndWear={() =>
          requireAuth({ action: "addAndWear", pieceId: currentPiece.id }, () => {
            void addAndWear(currentPiece.id).then(({ inserted }) => {
              if (inserted) bumpSaved()
            })
          })
        }
        onRemoveFromWardrobe={() => {
          void removeFromWardrobe(currentPiece.id).then(({ error }) => {
            if (!error) dropSaved()
          })
        }}
        onLikeCountChange={(likeCount) => upsert({ ...piece, likeCount })}
        onWear={wearPiece}
        onAddToWardrobe={handleAdd}
        onAddAndWear={handleAddAndWear}
        onRemoveFromWardrobe={handleRemove}
      />

      <PieceComments
        garmentId={currentPiece.id}
        garmentOwnerId={currentPiece.userId}
        isPublic={currentPiece.isPublic !== false}
        garmentId={piece.id}
        garmentOwnerId={piece.userId}
        isPublic={piece.isPublic !== false}
      />

      <InspectorModal
        open={editing}
        title={currentPiece.name}
        title={piece.name}
        onClose={() => setEditing(false)}
      >
        <UploadInspector piece={currentPiece} onDeleted={leaveAfterDelete} />
        <UploadInspector piece={piece} onDeleted={leaveAfterDelete} />
      </InspectorModal>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
