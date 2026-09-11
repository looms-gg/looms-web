import type { CSSProperties } from "react"
import { Pencil } from "@phosphor-icons/react"
import { GROUP_LABEL, SLOT_LABEL, pieceCovers, type Piece } from "../../data/catalog"
import { Icon } from "../../components/ui/Icon"
import { MakerLink } from "../../components/piece/MakerLink"
import { SkinStage } from "../../components/iso/SkinStage"
import { PieceActions } from "./PieceActions"

function revealStyle(i: number): CSSProperties {
  return { "--piece-i": i } as CSSProperties
}

export function PieceSheet({
  piece,
  owned,
  wearing,
  isCreator,
  onEdit,
  onLikeCountChange,
  onWear,
  onAddToWardrobe,
  onAddAndWear,
  onRemoveFromWardrobe,
}: {
  piece: Piece
  owned: boolean
  wearing: boolean
  isCreator: boolean
  onEdit: () => void
  onLikeCountChange: (likeCount: number) => void
  onWear: () => void
  onAddToWardrobe: () => void
  onAddAndWear: () => void
  onRemoveFromWardrobe: () => void
}) {
  const coverLabels = pieceCovers(piece).map((g) => GROUP_LABEL[g])

  return (
    <section className="piece-sheet relative overflow-hidden rounded-[22px] bg-base-200">
      {isCreator ? (
        <button
          type="button"
          className="btn btn-sm absolute right-3 top-3 z-20 min-h-10 rounded-full border border-base-content/15 bg-base-100/90 font-extrabold backdrop-blur"
          aria-label={`Edit ${piece.name}`}
          title={`Edit ${piece.name}`}
          onClick={onEdit}
        >
          <Icon icon={Pencil} size="sm" className="mr-1.5" />
          Edit
        </button>
      ) : null}
      <div className="grid md:grid-cols-[minmax(280px,1fr)_minmax(0,1.05fr)]">
        <div
          className="piece-reveal piece-preview relative min-h-[320px] bg-base-300 md:min-h-[440px]"
          style={revealStyle(1)}
          role="img"
          aria-label={`${piece.name}, a ${SLOT_LABEL[piece.slot]} piece for Minecraft skins, shown on a 3D Minecraft character`}
          title={`${piece.name} — ${SLOT_LABEL[piece.slot]} piece preview`}
        >
          <SkinStage
            outfit={[piece]}
            className="h-full min-h-[320px] md:min-h-[440px]" />
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
              <MakerLink username={piece.maker} className="font-semibold text-primary" />
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

          <PieceActions
            piece={piece}
            owned={owned}
            wearing={wearing}
            isCreator={isCreator}
            onLikeCountChange={onLikeCountChange}
            onWear={onWear}
            onAddToWardrobe={onAddToWardrobe}
            onAddAndWear={onAddAndWear}
            onRemoveFromWardrobe={onRemoveFromWardrobe} />
        </div>
      </div>
    </section>
  )
}
