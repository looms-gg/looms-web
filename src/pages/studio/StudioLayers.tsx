import { CaretDown, CaretUp, X } from "@phosphor-icons/react"
import type { Piece, Slot } from "../../data/catalog"
import { SLOT_LABEL } from "../../data/catalog"
import type { Body } from "../../data/bodies"
import { getEye, eyeThumbUrl } from "../../data/eyes"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { Icon } from "../../components/ui/Icon"
import type { SkinModel } from "../../skin/convert"

function StackRow({
  piece,
  outside,
  inside,
  canShift,
  onMove,
  onClear,
}: {
  piece: Piece
  outside: boolean
  inside: boolean
  canShift: boolean
  onMove: (id: string, steps: number) => void
  onClear: (slot: Slot) => void
}) {
  const eye = piece.slot === "eyes" ? getEye(piece.id) : undefined
  return (
    <li className="studio-stack-row">
      {eye ? (
        <div className="iso-frame iso-frame--chip flex items-center justify-center bg-base-300">
          <img
            src={eyeThumbUrl(eye)}
            alt=""
            className="size-7 [image-rendering:pixelated]" />
        </div>
      ) : (
        <IsoThumb piece={piece} alt="" chip />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">{piece.name}</p>
        <p className="text-xs font-bold text-base-content/50">{SLOT_LABEL[piece.slot]}</p>
      </div>
      <div className="flex items-stretch gap-0.5">
        {canShift ? (
          <div className="flex min-h-11 shrink-0 flex-col self-stretch">
            <button
              type="button"
              className="studio-stack-btn"
              aria-label={`Move ${piece.name} outside`}
              disabled={outside}
              onClick={() => onMove(piece.id, 1)}
            >
              <Icon icon={CaretUp} size="xs" />
            </button>
            <button
              type="button"
              className="studio-stack-btn"
              aria-label={`Move ${piece.name} inside`}
              disabled={inside}
              onClick={() => onMove(piece.id, -1)}
            >
              <Icon icon={CaretDown} size="xs" />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="studio-stack-btn studio-stack-drop"
          aria-label={`Take off ${piece.name}`}
          onClick={() => onClear(piece.slot)}
        >
          <Icon icon={X} size="sm" />
        </button>
      </div>
    </li>
  )
}

export function StudioLayers({
  body,
  bodyTint,
  model,
  stackTopFirst,
  onModel,
  onMove,
  onClear,
  onOpenAppearance,
  bodyHue = 0,
}: {
  body: Body
  bodyTint: string
  model: SkinModel
  stackTopFirst: Piece[]
  onModel: (model: SkinModel) => void
  onMove: (id: string, steps: number) => void
  onClear: (slot: Slot) => void
  onOpenAppearance?: () => void
  bodyHue?: number
}) {
  const canShift = stackTopFirst.length > 1

  return (
    <aside className="studio-layers rounded-[18px] bg-base-200 p-4">
      <div className="studio-layers-head">
        <h2 className="text-lg font-extrabold">Layers</h2>
        <p className="mt-1 text-sm text-base-content/65">
          Body stays at the bottom. Top sits outside.
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-base-content/10 pt-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/60">
            Model
          </span>
          <div
            className="flex items-center gap-1 rounded-full bg-base-300 p-0.5"
            role="group"
            aria-label="Arm model"
          >
            <button
              type="button"
              className={`btn btn-xs h-7 min-h-0 rounded-full border-0 font-extrabold px-3 ${
                model === "classic" ? "btn-primary shadow-xs" : "btn-ghost text-base-content/70"
              }`}
              onClick={() => onModel("classic")}
              aria-pressed={model === "classic"}
            >
              Classic (<span className="tabular-nums">4</span>px)
            </button>
            <button
              type="button"
              className={`btn btn-xs h-7 min-h-0 rounded-full border-0 font-extrabold px-3 ${
                model === "slim" ? "btn-primary shadow-xs" : "btn-ghost text-base-content/70"
              }`}
              onClick={() => onModel("slim")}
              aria-pressed={model === "slim"}
            >
              Slim (<span className="tabular-nums">3</span>px)
            </button>
          </div>
        </div>
      </div>
      <ul className="studio-layers-list flex flex-col gap-2">
        {stackTopFirst.map((piece, visual) => (
          <StackRow
            key={piece.id}
            piece={piece}
            outside={visual === 0}
            inside={visual === stackTopFirst.length - 1}
            canShift={canShift}
            onMove={onMove}
            onClear={onClear} />
        ))}
        <li
          className={`studio-stack-row studio-stack-body ${
            onOpenAppearance ? "cursor-pointer hover:bg-base-300 transition-colors" : ""
          }`}
          onClick={onOpenAppearance}
          title={onOpenAppearance ? "Edit body color & eyes in Appearance" : undefined}
          role={onOpenAppearance ? "button" : undefined}
          tabIndex={onOpenAppearance ? 0 : undefined}
          onKeyDown={
            onOpenAppearance
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpenAppearance()
                  }
                }
              : undefined
          }
        >
          <span className="studio-body-chip" style={{ background: bodyTint }} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">Body</p>
            <p className="text-xs font-bold text-base-content/50">
              {body.name}
              {bodyHue ? " · hue" : ""} · lowest
            </p>
          </div>
          {onOpenAppearance ? (
            <span className="badge badge-neutral badge-xs font-extrabold text-[10px]">
              Edit
            </span>
          ) : null}
        </li>
      </ul>
    </aside>
  )
}
