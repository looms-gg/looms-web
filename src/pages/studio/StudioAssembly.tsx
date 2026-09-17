import { useRef, useState } from "react"
import {
  ArrowCounterClockwise,
  CaretDown,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react"
import type { Piece, Slot } from "../../data/catalog"
import { SLOT_LABEL } from "../../data/catalog"
import { bodies as defaultBodies, type Body } from "../../data/bodies"
import { getEye, eyeThumbUrl } from "../../data/eyes"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { Icon } from "../../components/ui/Icon"
import type { SkinModel } from "../../skin/convert"
import { HUE_MAX, HUE_MIN, hueRamp, shiftHex } from "../../skin/hue"

function DragGripIcon({ className = "w-2.5 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 8 14"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1.15" />
      <circle cx="2" cy="7" r="1.15" />
      <circle cx="2" cy="12" r="1.15" />
      <circle cx="6" cy="2" r="1.15" />
      <circle cx="6" cy="7" r="1.15" />
      <circle cx="6" cy="12" r="1.15" />
    </svg>
  )
}

export function StudioAssembly({
  body,
  bodies = defaultBodies,
  bodyTint,
  bodyHue = 0,
  model,
  stackTopFirst,
  onModel,
  onMove,
  onReorder,
  onClear,
  onPickTone,
  onBodyHue,
  initialBodyExpanded = false,
}: {
  body: Body
  bodies?: Body[]
  bodyTint?: string
  bodyHue?: number
  model: SkinModel
  stackTopFirst: Piece[]
  onModel: (model: SkinModel) => void
  onMove: (id: string, steps: number) => void
  onReorder: (id: string, visualTargetIndex: number) => void
  onClear: (slot: Slot) => void
  onPickTone: (id: string) => void
  onBodyHue: (hue: number) => void
  initialBodyExpanded?: boolean
}) {
  const [bodyExpanded, setBodyExpanded] = useState(initialBodyExpanded)
  const currentTint = bodyTint ?? shiftHex(body.swatch, bodyHue)
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map())

  type DragState = {
    id: string
    startIndex: number
    currentIndex: number
    startY: number
    deltaY: number
    pitch: number
    slotMidYs: number[]
  }

  const dragStateRef = useRef<DragState | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  const handlePointerDown = (
    e: React.PointerEvent<HTMLLIElement>,
    id: string,
    index: number,
  ) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement | null
    if (target?.closest("button:not(.studio-stack-drag), input, select, a")) return

    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}

    const slotMidYs: number[] = []
    let totalPitch = 0
    let pitchCount = 0

    for (let i = 0; i < stackTopFirst.length; i++) {
      const piece = stackTopFirst[i]
      const el = rowRefs.current.get(piece.id)
      if (el) {
        const rect = el.getBoundingClientRect()
        slotMidYs.push(rect.top + rect.height / 2)
        if (i > 0 && slotMidYs[i - 1] !== undefined) {
          totalPitch += Math.abs(slotMidYs[i] - slotMidYs[i - 1])
          pitchCount++
        }
      } else {
        slotMidYs.push(0)
      }
    }

    const pitch = pitchCount > 0 ? totalPitch / pitchCount : 60

    const state: DragState = {
      id,
      startIndex: index,
      currentIndex: index,
      startY: e.clientY ?? 0,
      deltaY: 0,
      pitch,
      slotMidYs,
    }
    dragStateRef.current = state
    setDragState(state)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const current = dragStateRef.current
    if (!current) return

    const deltaY = (e.clientY ?? 0) - current.startY
    const clientY = e.clientY ?? 0

    let closestIndex = current.startIndex
    let minDistance = Infinity

    for (let i = 0; i < current.slotMidYs.length; i++) {
      const midY = current.slotMidYs[i]
      const distance = Math.abs(clientY - midY)
      if (distance < minDistance) {
        minDistance = distance
        closestIndex = i
      }
    }

    current.deltaY = deltaY
    current.currentIndex = closestIndex

    setDragState({ ...current })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const current = dragStateRef.current
    if (!current) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    if (current.currentIndex !== current.startIndex) {
      onReorder(current.id, current.currentIndex)
    }
    dragStateRef.current = null
    setDragState(null)
  }

  const handlePointerCancel = (e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    dragStateRef.current = null
    setDragState(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, piece: Piece) => {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      onMove(piece.id, 1)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      onMove(piece.id, -1)
    }
  }

  return (
    <aside className="studio-layers flex flex-col h-full rounded-2xl bg-base-200 border border-base-content/10 p-4">
      {/* Header */}
      <div className="studio-layers-head shrink-0">
        <h2 className="text-xs font-black uppercase tracking-[0.08em] text-base-content/70">Assembly</h2>
        <p className="mt-1 text-xs text-base-content/50 leading-tight">
          Character Assembly · Drag and reorder layers to prioritize elements.
        </p>
        <div className="mt-3 border-t border-base-content/10 pt-3">
          <div
            className={`tactile-segment-track ${model === "slim" ? "on-right" : ""}`}
            role="group"
            aria-label="Arm model"
          >
            <span className="tactile-segment-thumb" aria-hidden />
            <button
              type="button"
              className={`tactile-segment-tab ${model === "classic" ? "tactile-segment-tab-on" : ""}`}
              onClick={() => onModel("classic")}
              aria-pressed={model === "classic"}
            >
              Classic
            </button>
            <button
              type="button"
              className={`tactile-segment-tab ${model === "slim" ? "tactile-segment-tab-on" : ""}`}
              onClick={() => onModel("slim")}
              aria-pressed={model === "slim"}
            >
              Slim
            </button>
          </div>
        </div>
      </div>

      {/* Layer Stack List */}
      <ul className="studio-layers-list">
        {stackTopFirst.map((piece, visualIndex) => {
          const eye = piece.slot === "eyes" ? getEye(piece.id) : undefined
          const isDragging = dragState?.id === piece.id

          let rowTransform = "translateY(0px)"
          let rowTransition =
            "transform 220ms cubic-bezier(0.2, 0, 0, 1), box-shadow 160ms ease, border-color 160ms ease"
          let rowZIndex = 1

          if (dragState) {
            if (isDragging) {
              const minDelta = -dragState.startIndex * dragState.pitch - 16
              const maxDelta =
                (stackTopFirst.length - 1 - dragState.startIndex) * dragState.pitch + 16
              const clampedY = Math.max(minDelta, Math.min(maxDelta, dragState.deltaY))

              rowTransform = `translateY(${clampedY}px)`
              rowTransition = "box-shadow 160ms ease, border-color 160ms ease, transform 0s"
              rowZIndex = 30
            } else {
              if (dragState.startIndex < dragState.currentIndex) {
                // Dragging down: intermediate rows shift UP
                if (visualIndex > dragState.startIndex && visualIndex <= dragState.currentIndex) {
                  rowTransform = `translateY(-${dragState.pitch}px)`
                }
              } else if (dragState.startIndex > dragState.currentIndex) {
                // Dragging up: intermediate rows shift DOWN
                if (visualIndex >= dragState.currentIndex && visualIndex < dragState.startIndex) {
                  rowTransform = `translateY(${dragState.pitch}px)`
                }
              }
              rowZIndex = 10
            }
          }

          return (
            <li
              key={piece.id}
              ref={(node) => {
                if (node) rowRefs.current.set(piece.id, node)
                else rowRefs.current.delete(piece.id)
              }}
              style={{
                touchAction: "none",
                transform: rowTransform,
                transition: rowTransition,
                zIndex: rowZIndex,
              }}
              className={`studio-stack-row group relative select-none touch-none ${
                isDragging ? "studio-stack-row-drag cursor-grabbing" : "cursor-grab"
              }`}
              onPointerDown={(e) => handlePointerDown(e, piece.id, visualIndex)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onKeyDown={(e) => handleKeyDown(e, piece)}
            >
              {/* Custom drag affordance / keyboard reorder handle */}
              <button
                type="button"
                className="studio-stack-drag p-1 -ml-0.5 text-base-content/30 group-hover:text-base-content/70 transition-colors rounded select-none shrink-0 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                tabIndex={0}
                aria-label={`Reorder ${piece.name}. Up to move outside, Down to move inside.`}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  handleKeyDown(e, piece)
                }}
              >
                <DragGripIcon />
              </button>

              {/* Thumbnail chip */}
              <div
                className="size-10 rounded-xl bg-base-300 flex items-center justify-center overflow-hidden border border-base-content/10 shrink-0 pointer-events-none"
                style={eye ? { backgroundColor: bodyTint } : undefined}
              >
                {eye ? (
                  <img
                    src={eyeThumbUrl(eye)}
                    alt=""
                    className="size-full [image-rendering:pixelated]"
                  />
                ) : (
                  <IsoThumb piece={piece} alt="" chip className="w-full h-full" />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1 pointer-events-none">
                <p className="truncate font-extrabold text-xs text-base-content leading-tight">{piece.name}</p>
                <p className="text-[11px] font-medium text-base-content/50">{SLOT_LABEL[piece.slot]}</p>
              </div>

              {/* Take-off button */}
              <button
                type="button"
                className="btn btn-ghost btn-xs size-7 min-h-0 p-0 rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-300/80 transition-colors shrink-0 cursor-pointer"
                aria-label={`Take off ${piece.name}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onClear(piece.slot)}
              >
                <Icon icon={X} size="sm" />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Pinned Footer Body Section */}
      <div className="studio-assembly-body shrink-0 border-t border-base-content/10 pt-3">
        {/* Body summary toggle button with carat */}
        <button
          type="button"
          onClick={() => setBodyExpanded((open) => !open)}
          aria-expanded={bodyExpanded}
          aria-controls="studio-body-controls"
          aria-label={bodyExpanded ? "Collapse body options" : "Expand body options"}
          className="studio-stack-row studio-stack-body w-full text-left cursor-pointer transition-colors group select-none"
        >
          <span className="studio-body-chip" style={{ background: currentTint }} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold text-xs text-base-content">Body</p>
            <p className="text-[11px] font-medium text-base-content/50">
              {body.name}
              {bodyHue ? " · hue" : ""} · lowest
            </p>
          </div>
          <span
            className="size-7 rounded-lg flex items-center justify-center text-base-content/50 group-hover:text-base-content transition-colors shrink-0"
            aria-hidden="true"
          >
            <Icon
              icon={CaretDown}
              size="sm"
              className={`transition-transform duration-200 ${bodyExpanded ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {/* Collapsible Tone Swatches & Hue Shift Slider */}
        {bodyExpanded && (
          <div id="studio-body-controls" className="mt-2.5 space-y-3">
            {/* Tone Swatches */}
            <div className="studio-tones !mt-0" role="radiogroup" aria-label="Body color">
              {bodies.map((tone) => {
                const on = tone.id === body.id
                return (
                  <button
                    key={tone.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={tone.name}
                    className={`studio-tone ${on ? "studio-tone-on" : ""}`}
                    style={{
                      background: on ? currentTint : tone.swatch,
                    }}
                    onClick={() => onPickTone(tone.id)}
                  />
                )
              })}
            </div>

            {/* Permanent Hue Shift Slider */}
            <div className="pt-2.5 border-t border-base-content/8">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-extrabold text-base-content/60 flex items-center gap-1.5">
                  <Icon icon={SlidersHorizontal} size="xs" className="text-base-content/40" />
                  Hue Shift
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums font-bold text-base-content/70">
                    {bodyHue > 0 ? `+${bodyHue}` : bodyHue}
                  </span>
                  {bodyHue !== 0 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs h-5 min-h-0 px-1 text-base-content/50 hover:text-base-content cursor-pointer"
                      onClick={() => onBodyHue(0)}
                      title="Reset hue"
                      aria-label="Reset hue"
                    >
                      <Icon icon={ArrowCounterClockwise} size="xs" />
                    </button>
                  ) : null}
                </div>
              </div>
              <span
                className="studio-hue-track block"
                style={{ background: hueRamp(body.swatch) }}
              >
                <input
                  type="range"
                  min={HUE_MIN}
                  max={HUE_MAX}
                  value={bodyHue}
                  aria-label={`Hue shift for ${body.name}`}
                  className="studio-hue-range"
                  onChange={(event) => onBodyHue(Number(event.target.value))}
                />
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
