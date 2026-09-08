import { useEffect, useState, type CSSProperties } from "react"
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom"
import { getPiece } from "../data/catalog"
import { AuthModal } from "../components/auth/AuthModal"
import { PieceComments } from "../components/piece/PieceComments"
import { useCloset } from "../state/closet"
import { useCatalog } from "../state/catalog"
import { useAuthOptional } from "../state/auth"
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
  const { owns, addToWardrobe, wear, addAndWear, equipped } = useCloset()
  const [editing, setEditing] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

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
    }
  }, [id, location.key])

  const stateFrom = (location.state as { from?: string } | null)?.from
  const backTo = stateFrom || "/"
  const backLabel = stateFrom?.startsWith("/wardrobe") ? "← Wardrobe" : "← Explore"

  if (!piece) {
    if (loading) return <PieceSkeleton />
    return <Navigate to="/" replace />
  }

  const currentPiece = piece
  const owned = owns(currentPiece.id)
  const wearing = equipped[currentPiece.slot] === currentPiece.id
  const isCreator = Boolean(
    user?.id && currentPiece.userId && user.id === currentPiece.userId,
  )

  function leaveAfterDelete() {
    setEditing(false)
    void navigate(stateFrom || "/wardrobe?tab=uploads", { replace: true })
  }

  function bumpSaved() {
    const latest = getPiece(currentPiece.id) ?? currentPiece
    upsert({ ...latest, savedCount: latest.savedCount + 1 })
  }

  function requireAuth(action: () => void) {
    if (!user) {
      setAuthOpen(true)
      return
    }
    action()
  }

  return (
    <div className="space-y-4">
      <Link
        to={backTo}
        className="piece-reveal link inline-flex min-h-11 items-center text-sm font-bold text-primary no-underline"
        style={revealStyle(0)}
      >
        {backLabel}
      </Link>

      <PieceSheet
        piece={currentPiece}
        owned={owned}
        wearing={wearing}
        isCreator={isCreator}
        onEdit={() => setEditing(true)}
        onLikeCountChange={(likeCount) => upsert({ ...currentPiece, likeCount })}
        onWear={() => wear(currentPiece.id)}
        onAddToWardrobe={() =>
          requireAuth(() => {
            void addToWardrobe(currentPiece.id).then(({ inserted }) => {
              if (inserted) bumpSaved()
            })
          })
        }
        onAddAndWear={() =>
          requireAuth(() => {
            void addAndWear(currentPiece.id).then(({ inserted }) => {
              if (inserted) bumpSaved()
            })
          })
        }
      />

      <PieceComments
        garmentId={currentPiece.id}
        garmentOwnerId={currentPiece.userId}
        isPublic={currentPiece.isPublic !== false}
      />

      <InspectorModal
        open={editing}
        title={currentPiece.name}
        onClose={() => setEditing(false)}
      >
        <UploadInspector piece={currentPiece} onDeleted={leaveAfterDelete} />
      </InspectorModal>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
