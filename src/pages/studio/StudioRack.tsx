import { useState } from "react"
import { Link } from "react-router-dom"
import {
  faBan,
  faPalette,
  faRotateLeft,
  faSliders,
} from "@fortawesome/free-solid-svg-icons"
import {
  SLOT_LABEL,
  type Piece,
  type Slot,
} from "../../data/catalog"
import type { Equipped } from "../../data/outfit"
import { bodies as defaultBodies, bodyOrDefault, type Body } from "../../data/bodies"
import { bundledEyes, EYE_OFFSET_MAX, EYE_OFFSET_MIN, parseEyeId } from "../../data/eyes"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { FaIcon } from "../../components/ui/FaIcon"
import { HUE_MAX, HUE_MIN, hueRamp, shiftHex } from "../../skin/hue"
import type { StudioRackTab } from "./studioOwned"
import { MAX_LIMITS } from "../../lib/sanitize"

function PieceRackRow({
  piece,
  on,
  onWear,
  onClear,
}: {
  piece: Piece
  on: boolean
  onWear: (id: string) => void
  onClear: (slot: Slot) => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? `Take off ${piece.name}` : `Wear ${piece.name}`}
        onClick={() => (on ? onClear(piece.slot) : onWear(piece.id))}
        className={`studio-piece flex w-full items-center gap-3 rounded-[12px] p-2 text-left cursor-pointer transition-all ${
          on ? "studio-piece-on" : ""
        }`}
      >
        <IsoThumb piece={piece} alt="" chip />
        <div className="flex-1 min-w-0">
          <p className="font-extrabold truncate">{piece.name}</p>
          <p className="text-[11px] font-bold text-base-content/50 uppercase tracking-[0.04em]">
            {SLOT_LABEL[piece.slot]}
          </p>
        </div>
        {on ? (
          <span className="badge badge-xs badge-neutral font-extrabold px-1.5 shrink-0">
            Worn
          </span>
        ) : null}
      </button>
    </li>
  )
}

export function StudioRack({
  ownedCount,
  ownedBySlot,
  racks,
  rack,
  equipped,
  onRack,
  onWear,
  onClear,
  bodies = defaultBodies,
  body,
  bodyId = bodies[0]?.id ?? "fair",
  bodyHue = 0,
  bodyTint,
  hueOpen = false,
  equippedEyes,
  eyeOffset = 0,
  onPickTone,
  onBodyHue,
  onEyeOffset,
}: {
  ownedCount: number
  ownedBySlot: Record<Slot, Piece[]>
  racks: Slot[]
  rack: StudioRackTab
  equipped: Equipped
  onRack: (rack: StudioRackTab) => void
  onWear: (id: string) => void
  onClear: (slot: Slot) => void
  bodies?: Body[]
  body?: Body
  bodyId?: string
  bodyHue?: number
  bodyTint?: string
  hueOpen?: boolean
  equippedEyes?: string
  eyeOffset?: number
  onPickTone?: (id: string) => void
  onBodyHue?: (hue: number) => void
  onEyeOffset?: (offset: number) => void
}) {
  const currentBody = body ?? bodyOrDefault(bodyId)
  const currentTint = bodyTint ?? shiftHex(currentBody.swatch, bodyHue)
  const [eyeFilter, setEyeFilter] = useState("")

  const filteredEyes = bundledEyes.filter((eye) => {
    if (!eyeFilter.trim()) return true
    const q = eyeFilter.trim().toLowerCase()
    return eye.id.toLowerCase().includes(q) || eye.name.toLowerCase().includes(q)
  })

  const shownSlots = rack === "all" ? racks : racks.filter((slot) => slot === rack)
  const hasOwned = ownedCount > 0
  const isAppearance = rack === "appearance"

  return (
    <aside className="studio-wardrobe rounded-[18px] bg-base-200 p-4">
      <div className="studio-wardrobe-head">
        {/* Top-level header with clickable Pieces and Appearance tabs */}
        <div className="flex items-center gap-1 border-b border-base-content/10 pb-2.5">
          <button
            type="button"
            className={`text-base font-extrabold px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
              !isAppearance
                ? "bg-base-300 text-base-content shadow-xs"
                : "text-base-content/50 hover:text-base-content hover:bg-base-300/40"
            }`}
            onClick={() => onRack(isAppearance ? "all" : rack)}
            aria-pressed={!isAppearance}
          >
            Pieces
          </button>
          <button
            type="button"
            className={`text-base font-extrabold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all ${
              isAppearance
                ? "bg-base-300 text-base-content shadow-xs"
                : "text-base-content/50 hover:text-base-content hover:bg-base-300/40"
            }`}
            onClick={() => onRack("appearance")}
            aria-pressed={isAppearance}
          >
            <FaIcon
              icon={faPalette}
              className={`size-3.5 ${
                isAppearance ? "text-primary" : "text-base-content/40"
              }`}
            />
            Appearance
          </button>
        </div>

        {/* Sub-category pills for Pieces */}
        {!isAppearance && hasOwned ? (
          <div
            className="studio-wardrobe-tabs"
            data-testid="studio-wardrobe-tabs"
            onWheel={(e) => {
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.currentTarget.scrollLeft += e.deltaY
              }
            }}
          >
            <button
              type="button"
              className={`badge h-8 shrink-0 rounded-full border-0 px-3 font-bold cursor-pointer ${
                rack === "all" ? "badge-primary" : "badge-neutral"
              }`}
              onClick={() => onRack("all")}
            >
              All
            </button>
            {racks.map((slot) => (
              <button
                key={slot}
                type="button"
                className={`badge h-8 shrink-0 rounded-full border-0 px-3 font-bold cursor-pointer ${
                  rack === slot ? "badge-primary" : "badge-neutral"
                }`}
                onClick={() => onRack(slot)}
              >
                {SLOT_LABEL[slot]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="studio-wardrobe-body">
      {isAppearance ? (
        <div className="studio-wardrobe-clip flex flex-col">
          <div className="studio-wardrobe-list space-y-3">
            {/* Skin Tone Section - Sticky to top */}
            <div className="sticky top-0 z-10 bg-base-200 pt-1 pb-2 -mt-1">
              <div className="rounded-[14px] bg-base-300/85 p-3 shadow-xs border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-4 rounded-full shadow-xs ring-1 ring-white/20"
                      style={{ background: currentTint }}
                    />
                    <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
                      Skin Tone
                    </span>
                  </div>
                  <span className="text-xs font-bold text-base-content/60">
                    {currentBody.name}
                  </span>
                </div>
                <div className="studio-tones" role="radiogroup" aria-label="Body color">
                {bodies.map((tone) => {
                  const on = tone.id === currentBody.id
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={
                        on
                          ? `${tone.name}, selected. Click again to shift hue.`
                          : tone.name
                      }
                      className={`studio-tone ${on ? "studio-tone-on" : ""} ${
                        on && (hueOpen || bodyHue !== 0) ? "studio-tone-edit" : ""
                      }`}
                      style={{
                        background: on ? currentTint : tone.swatch,
                      }}
                      onClick={() => onPickTone?.(tone.id)}
                    />
                  )
                })}
              </div>

              {/* Hue shift slider */}
              <div className="mt-3 pt-2.5 border-t border-white/5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-extrabold text-base-content/60 flex items-center gap-1.5">
                    <FaIcon icon={faSliders} className="size-3 text-base-content/40" />
                    Hue Shift
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-bold text-base-content/70">
                      {bodyHue > 0 ? `+${bodyHue}` : bodyHue}
                    </span>
                    {bodyHue !== 0 ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs h-5 min-h-0 px-1 text-base-content/50 hover:text-base-content"
                        onClick={() => onBodyHue?.(0)}
                        title="Reset hue"
                      >
                        <FaIcon icon={faRotateLeft} className="size-2.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <span
                  className="studio-hue-track block"
                  style={{ background: hueRamp(currentBody.swatch) }}
                >
                  <input
                    type="range"
                    min={HUE_MIN}
                    max={HUE_MAX}
                    value={bodyHue}
                    aria-label={`Hue shift for ${currentBody.name}`}
                    className="studio-hue-range"
                    onChange={(event) => onBodyHue?.(Number(event.target.value))}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Eyes Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
                    Eyes
                  </span>
                  <span className="badge badge-neutral badge-xs font-bold text-[10px]">
                    {bundledEyes.length}
                  </span>
                </div>
                {equippedEyes ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-xs font-extrabold text-error px-1.5"
                    onClick={() => onClear("eyes")}
                  >
                    Clear eyes
                  </button>
                ) : null}
              </div>

              {/* Eye height adjustment */}
              {equippedEyes ? (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5 min-h-5">
                    <span className="font-extrabold text-base-content/60 flex items-center gap-1.5">
                      <FaIcon icon={faSliders} className="size-3 text-base-content/40" />
                      Eye height
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="inline-block min-w-[4.5rem] text-right tabular-nums font-bold text-base-content/70">
                        {eyeOffset === 0
                          ? "Default"
                          : eyeOffset < 0
                            ? `Up ${Math.abs(eyeOffset)}`
                            : `Down ${eyeOffset}`}
                      </span>
                      <button
                        type="button"
                        className={`btn btn-ghost btn-xs h-5 min-h-0 px-1 text-base-content/50 hover:text-base-content cursor-pointer ${
                          eyeOffset === 0 ? "invisible pointer-events-none" : ""
                        }`}
                        disabled={eyeOffset === 0}
                        onClick={() => onEyeOffset?.(0)}
                        title="Reset eye height"
                        aria-label="Reset eye height"
                      >
                        <FaIcon icon={faRotateLeft} className="size-2.5" />
                      </button>
                    </div>
                  </div>
                  <span className="studio-hue-track block bg-base-content/15">
                    <input
                      type="range"
                      min={EYE_OFFSET_MIN}
                      max={EYE_OFFSET_MAX}
                      step={1}
                      value={eyeOffset}
                      aria-label="Eye height on face"
                      className="studio-hue-range"
                      onChange={(event) => onEyeOffset?.(Number(event.target.value))}
                    />
                  </span>
                </div>
              ) : null}

              {/* Eye Filter */}
              <div className="relative mb-2.5">
                <input
                  type="search"
                  maxLength={MAX_LIMITS.SEARCH_QUERY}
                  placeholder="Filter eyes (e.g. 05)..."
                  value={eyeFilter}
                  onChange={(e) => setEyeFilter(e.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))}
                  className="input input-sm bg-base-100 rounded-xl w-full text-xs font-medium pl-3 pr-8"
                />
                {eyeFilter ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-base-content/40 hover:text-base-content"
                    onClick={() => setEyeFilter("")}
                  >
                    ✕
                  </button>
                ) : null}
              </div>

              {/* Eyes Grid */}
              <div className="grid grid-cols-2 gap-2 pb-6">
                {/* None option */}
                <button
                  type="button"
                  aria-pressed={!equippedEyes}
                  aria-label="No eyes"
                  onClick={() => onClear("eyes")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                    !equippedEyes
                      ? "border-primary bg-primary/20 text-primary shadow-xs font-bold ring-1 ring-primary"
                      : "border-transparent bg-base-100/60 hover:bg-base-100 text-base-content/60"
                  }`}
                >
                  <div className="size-11 rounded-lg bg-base-300 flex items-center justify-center">
                    <FaIcon icon={faBan} className="size-5 text-base-content/40" />
                  </div>
                  <span className="text-xs font-extrabold">Default</span>
                </button>

                {/* Eye Cards */}
                {filteredEyes.map((eye) => {
                  const isSelected = equippedEyes
                    ? parseEyeId(equippedEyes).baseId === eye.id
                    : false
                  return (
                    <button
                      key={eye.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={eye.name}
                      onClick={() => onWear(eye.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center gap-1.5 group ${
                        isSelected
                          ? "border-primary bg-primary/20 shadow-sm ring-1 ring-primary"
                          : "border-transparent bg-base-100/60 hover:bg-base-100 hover:scale-[1.02] active:scale-[0.96]"
                      }`}
                    >
                      <div className="size-11 rounded-lg bg-base-300/80 flex items-center justify-center overflow-hidden border border-white/5">
                        <img
                          src={eye.thumb}
                          alt=""
                          className="size-8 [image-rendering:pixelated] group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <span className="text-xs font-extrabold truncate max-w-full">
                        {eye.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : !hasOwned ? (
        <div className="mt-4 grid flex-1 place-items-center rounded-[12px] border border-dashed border-base-content/15 px-3 py-8 text-center">
          <p className="font-extrabold">Nothing unlocked yet</p>
          <p className="mt-1 text-sm text-base-content/65">
            Find pieces in Explore, or customize your body & eyes in Appearance.
          </p>
          <div className="mt-4 flex flex-col gap-2 w-full max-w-[180px]">
            <button
              type="button"
              className="btn btn-secondary rounded-full font-extrabold btn-sm"
              onClick={() => onRack("appearance")}
            >
              <FaIcon icon={faPalette} className="size-3.5 mr-1" />
              Appearance
            </button>
            <Link to="/" className="btn btn-primary rounded-full font-extrabold btn-sm">
              Explore pieces
            </Link>
          </div>
        </div>
      ) : (
        <div className="studio-wardrobe-clip">
          <div className="studio-wardrobe-list space-y-4">
            {shownSlots.map((slot) => (
              <div key={slot}>
                {rack === "all" ? (
                  <p className="mb-2 text-sm font-bold text-base-content/55">
                    {SLOT_LABEL[slot]}
                  </p>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {ownedBySlot[slot].map((piece) => (
                    <PieceRackRow
                      key={piece.id}
                      piece={piece}
                      on={equipped[slot] === piece.id}
                      onWear={onWear}
                      onClear={onClear}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </aside>
  )
}
