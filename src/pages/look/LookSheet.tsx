import { useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import {
  faDownload,
  faLink,
  faCheck,
  faWandSparkles,
  faLayerGroup,
  faFlag,
} from "@fortawesome/free-solid-svg-icons"
import { SLOT_LABEL, type Piece } from "../../data/catalog"
import { FaIcon } from "../../components/ui/FaIcon"
import { MakerLink } from "../../components/piece/MakerLink"
import { SkinStage } from "../../components/iso/SkinStage"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { LikeButton } from "../../components/piece/LikeButton"
import type { PublicLook } from "../../state/publicLooks"
import { getLookShareUrl, copyShareLink } from "../../lib/share"
import { useAuthOptional } from "../../state/auth"
import { AuthModal } from "../../components/auth/AuthModal"
import { ReportModal } from "../../components/moderation/ReportModal"

function revealStyle(i: number): CSSProperties {
  return { "--piece-i": i } as CSSProperties
}

export function LookSheet({
  look,
  outfit,
  onLikeCountChange,
  onWear,
  onDownload,
}: {
  look: PublicLook
  outfit: Piece[]
  onLikeCountChange: (likeCount: number) => void
  onWear: () => void
  onDownload: () => void
}) {
  const auth = useAuthOptional()
  const [copied, setCopied] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const isCreator = Boolean(auth?.user?.id && auth.user.id === look.userId)

  const handleCopyLink = async () => {
    const url = getLookShareUrl(look.id)
    const success = await copyShareLink(url)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const createdDate = new Date(look.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <section className="piece-sheet relative overflow-hidden rounded-[22px] bg-base-200">
      <div className="grid md:grid-cols-[minmax(280px,1fr)_minmax(0,1.1fr)]">
        {/* Left: 3D / Live Stage Character Preview */}
        <div
          className="piece-reveal piece-preview relative min-h-[340px] bg-base-300 md:min-h-[480px]"
          style={revealStyle(1)}
        >
          <SkinStage
            outfit={outfit}
            bodyId={look.bodyId}
            bodyHue={look.bodyHue}
            model={look.model}
            fullFigure={true}
            className="h-full min-h-[340px] md:min-h-[480px]"
          />
        </div>

        {/* Right: Look Details, Actions, and Layers Breakdown */}
        <div className="flex flex-col justify-between gap-6 p-6 md:p-8 lg:p-10">
          <div className="space-y-4">
            <div className="piece-reveal space-y-3" style={revealStyle(2)}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-primary badge-outline h-6 border-primary/35 bg-primary/10 px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em]">
                  Look
                </span>
                <span className="badge badge-ghost h-6 border-0 bg-base-300 px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-base-content/70">
                  {look.model === "slim" ? "Slim 3px" : "Classic 4px"}
                </span>
                <span className="text-xs font-bold text-base-content/50">
                  Saved on {createdDate}
                </span>
              </div>

              <h1 className="text-balance text-3xl font-black tracking-tight sm:text-4xl">
                {look.name}
              </h1>

              <p className="text-sm font-bold">
                <MakerLink username={look.maker} prefix="Designed by @" className="text-primary" />
              </p>

              {look.description ? (
                <p className="max-w-prose text-sm leading-relaxed text-base-content/80 whitespace-pre-wrap text-pretty">
                  {look.description}
                </p>
              ) : null}
            </div>

            {/* Actions: Like, Wear, Download Skin, Share */}
            <div
              className="piece-reveal flex flex-wrap items-center gap-2.5 pt-2"
              style={revealStyle(3)}
            >
              <button
                type="button"
                className="btn btn-primary rounded-full font-black px-5 shadow-sm active:scale-[0.96] transition-transform"
                onClick={onWear}
              >
                <FaIcon icon={faWandSparkles} className="size-3.5 mr-1.5" />
                Wear in Studio
              </button>

              <button
                type="button"
                className="btn btn-ghost rounded-full border border-base-content/20 font-extrabold active:scale-[0.96] transition-transform"
                onClick={onDownload}
                title="Download 64x64 Minecraft skin PNG"
              >
                <FaIcon icon={faDownload} className="size-3.5 mr-1.5" />
                Download Skin
              </button>

              <LikeButton
                type="look"
                id={look.id}
                count={look.likeCount}
                onCountChange={onLikeCountChange}
              />

              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="btn btn-ghost btn-circle border border-base-content/15 active:scale-[0.96] transition-transform"
                title="Copy share link"
                aria-label="Copy share link"
              >
                <FaIcon icon={copied ? faCheck : faLink} className={`size-3.5 ${copied ? "text-success" : ""}`} />
              </button>

              {!isCreator ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!auth?.user) {
                      setAuthOpen(true)
                      return
                    }
                    setReportOpen(true)
                  }}
                  className="btn btn-ghost btn-circle border border-base-content/15 opacity-60 hover:opacity-100 active:scale-[0.96] transition-transform"
                  title="Report look"
                  aria-label="Report look"
                >
                  <FaIcon icon={faFlag} className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Outfit Layers Breakdown */}
          <div className="piece-reveal space-y-3 pt-4 border-t border-base-content/10" style={revealStyle(4)}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.06em] text-base-content/60 flex items-center gap-1.5">
                <FaIcon icon={faLayerGroup} className="size-3" />
                Outfit Layers ({outfit.length})
              </h2>
            </div>

            {outfit.length === 0 ? (
              <p className="text-xs text-base-content/50">No catalog clothing pieces worn.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {outfit.map((piece) => (
                  <Link
                    key={piece.id}
                    to={`/piece/${piece.id}`}
                    className="flex items-center gap-2.5 rounded-2xl border border-base-content/10 bg-base-100/80 p-2 text-inherit no-underline transition-colors duration-150 hover:border-primary hover:bg-base-100"
                  >
                    <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-base-300">
                      <IsoThumb piece={piece} alt={piece.name} className="size-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-base-content" title={piece.name}>
                        {piece.name}
                      </p>
                      <p className="text-[10px] font-bold text-base-content/50">
                        {SLOT_LABEL[piece.slot]}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      {auth?.user ? (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="look"
          targetId={look.id}
          targetLabel={`Look: ${look.name}`}
          reporterId={auth.user.id}
        />
      ) : null}
    </section>
  )
}
