import { useState, type CSSProperties } from "react"
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom"
import { faBookmark, faPen, faPlus } from "@fortawesome/free-solid-svg-icons"
import { getPiece, GROUP_LABEL, SLOT_LABEL, focusForPiece, pieceCovers } from "../data/catalog"
import { FaIcon } from "../components/FaIcon"
import { AuthModal } from "../components/AuthModal"
import { LikeButton } from "../components/LikeButton"
import { MakerLink } from "../components/MakerLink"
import { PieceComments } from "../components/PieceComments"
import { SkinStage } from "../components/SkinStage"
import { useSession } from "../state/closet"
import { useCatalog } from "../state/catalog"
import { useAuthOptional } from "../state/auth"
import { PieceSkeleton } from "./PieceSkeleton"
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
  const { owns, addToWardrobe, wear, addAndWear, equipped } = useSession()
  const [editing, setEditing] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const stateFrom = (location.state as { from?: string } | null)?.from
  const backTo = stateFrom || "/"
  const backLabel = stateFrom?.startsWith("/wardrobe")
    ? "← Wardrobe"
    : "← Explore"

  if (!piece) {
    if (loading) return <PieceSkeleton />
    return <Navigate to="/" replace />
  }

  const currentPiece = piece
  const owned = owns(currentPiece.id)
  const wearing = equipped[currentPiece.slot] === currentPiece.id
  const isCreator = Boolean(user?.id && currentPiece.userId && user.id === currentPiece.userId)
  const coverLabels = pieceCovers(currentPiece).map((g) => GROUP_LABEL[g])

  function leaveAfterDelete() {
    setEditing(false)
    void navigate(stateFrom || "/wardrobe?tab=uploads", { replace: true })
  }

  function bumpSaved() {
    const latest = getPiece(currentPiece.id) ?? currentPiece
    upsert({ ...latest, savedCount: latest.savedCount + 1 })
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

      <section className="piece-sheet relative overflow-hidden rounded-[22px] bg-base-200">
        {isCreator ? (
          <button
            type="button"
            className="btn btn-sm absolute right-3 top-3 z-20 min-h-10 rounded-full border border-base-content/15 bg-base-100/90 font-extrabold backdrop-blur"
            aria-label={`Edit ${piece.name}`}
            title={`Edit ${piece.name}`}
            onClick={() => setEditing(true)}
          >
            <FaIcon icon={faPen} className="size-3.5 mr-1.5" />
            Edit
          </button>
        ) : null}
        <div className="grid md:grid-cols-[minmax(280px,1fr)_minmax(0,1.05fr)]">
          <div
            className="piece-reveal piece-preview relative min-h-[320px] bg-base-300 md:min-h-[440px]"
            style={revealStyle(1)}
          >
            <SkinStage
              outfit={[piece]}
              group={focusForPiece(piece)}
              className="h-full min-h-[320px] md:min-h-[440px]"
            />
          </div>

          <div className="flex flex-col justify-center gap-5 p-6 md:p-8 lg:p-10">
            <div className="piece-reveal space-y-3" style={revealStyle(2)}>
              <div className="flex flex-wrap items-center gap-2">
                {coverLabels.map((label) => (
                  <span
                    key={label}
                    className="badge badge-ghost h-6 border-0 bg-base-300 px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-base-content/70"
                  >
                    {label}
                  </span>
                ))}
                <span className="badge badge-primary badge-outline h-6 border-primary/35 bg-primary/10 px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em]">
                  {SLOT_LABEL[piece.slot]}
                </span>
              </div>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                {piece.name}
              </h1>
              <p>
                <MakerLink
                  username={piece.maker}
                  className="font-semibold text-primary"
                />
              </p>
            </div>

            {piece.blurb ? (
              <p
                className="piece-reveal max-w-md text-pretty leading-[1.55] text-base-content/75"
                style={revealStyle(3)}
              >
                {piece.blurb}
              </p>
            ) : null}

            <div
              className="piece-reveal flex flex-wrap items-center gap-3"
              style={revealStyle(4)}
            >
              <LikeButton
                type="garment"
                id={piece.id}
                count={piece.likeCount}
                onCountChange={(likeCount) => upsert({ ...piece, likeCount })}
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
                  onClick={() => wear(piece.id)}
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
                    onClick={() => {
                      if (!user) {
                        setAuthOpen(true)
                        return
                      }
                      void addToWardrobe(piece.id).then((added) => {
                        if (added) bumpSaved()
                      })
                    }}
                  >
                    <span className="grid size-5 place-items-center rounded-full bg-primary-content/20">
                      <FaIcon icon={faPlus} className="size-2.5" />
                    </span>
                    Add to wardrobe
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 rounded-full font-bold"
                    onClick={() => {
                      if (!user) {
                        setAuthOpen(true)
                        return
                      }
                      void addAndWear(piece.id).then((added) => {
                        if (added) bumpSaved()
                      })
                    }}
                  >
                    Add & wear
                  </button>
                </>
              )}
              {owned ? (
                <Link
                  to="/studio"
                  className="btn btn-ghost min-h-11 rounded-full font-bold"
                >
                  Open studio
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

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
