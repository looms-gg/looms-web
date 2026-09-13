import { useState } from "react"
import {
  Prohibit,
  ArrowCounterClockwise,
  MagnifyingGlass,
  SlidersHorizontal,
  X,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { MAX_LIMITS } from "../../lib/sanitize"
import { bodies as defaultBodies, bodyOrDefault, type Body } from "../../data/bodies"
import {
  bundledEyes,
  EYE_OFFSET_MAX,
  EYE_OFFSET_MIN,
  eyeThumbUrl,
  parseEyeId,
} from "../../data/eyes"
import { HUE_MAX, HUE_MIN, hueRamp, shiftHex } from "../../skin/hue"

/**
 * The Appearance tab of the studio rack: skin tone, hue shift, eye picker,
 * and the eye-height dock. Lives apart from the pieces rack so StudioRack
 * keeps rack concerns only; the props are one coherent "current appearance"
 * bundle with its callbacks.
 */
export function StudioAppearancePanel({
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
  onWearEyes,
  onClearEyes,
}: {
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
  onWearEyes: (id: string) => void
  onClearEyes: () => void
}) {
  const currentBody = body ?? bodyOrDefault(bodyId)
  const currentTint = bodyTint ?? shiftHex(currentBody.swatch, bodyHue)
  const [eyeFilter, setEyeFilter] = useState("")

  const filteredEyes = bundledEyes.filter((eye) => {
    if (!eyeFilter.trim()) return true
    const q = eyeFilter.trim().toLowerCase()
    return eye.id.toLowerCase().includes(q) || eye.name.toLowerCase().includes(q)
  })

  return (
    <div className="studio-wardrobe-clip flex flex-col">
      <div className="studio-wardrobe-list space-y-3">
        {/* Skin Tone Section - Sticky to top */}
        <div className="sticky top-0 z-10 bg-base-200 pt-1 pb-2 -mt-1">
          <div className="rounded-[10px] bg-base-300/85 p-3 shadow-xs border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="size-4 rounded-full shadow-xs ring-1 ring-white/20"
                  style={{ background: currentTint }} />
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
                    onClick={() => onPickTone?.(tone.id)} />
                )
              })}
            </div>

            {/* Hue shift slider */}
            <div className="mt-3 pt-2.5 border-t border-white/5">
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
                      className="btn btn-ghost btn-xs h-5 min-h-0 px-1 text-base-content/50 hover:text-base-content"
                      onClick={() => onBodyHue?.(0)}
                      title="Reset hue"
                    >
                      <Icon icon={ArrowCounterClockwise} size="xs" />
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
                  onChange={(event) => onBodyHue?.(Number(event.target.value))} />
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
                onClick={onClearEyes}
              >
                Clear eyes
              </button>
            ) : null}
          </div>

          {/* Eye Filter — same pill-search pattern as Explore/Wardrobe */}
          <label className="input input-bordered flex h-8 mb-2.5 items-center gap-2 rounded-full bg-base-100 pl-3">
            <Icon icon={MagnifyingGlass} size="sm" className="shrink-0 opacity-50" />
            <input
              type="search"
              maxLength={MAX_LIMITS.SEARCH_QUERY}
              placeholder="Filter eyes (e.g. 05)..."
              aria-label="Filter eyes"
              value={eyeFilter}
              onChange={(e) => setEyeFilter(e.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))}
              className="grow border-none bg-transparent text-xs font-medium shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0" />
            {eyeFilter ? (
              <button
                type="button"
                aria-label="Clear eye filter"
                className="shrink-0 cursor-pointer text-base-content/40 hover:text-base-content"
                onClick={() => setEyeFilter("")}
              >
                <Icon icon={X} size="sm" />
              </button>
            ) : null}
          </label>

          {/* Eyes Grid */}
          <div className="grid grid-cols-2 gap-2 pb-6">
            {/* None option */}
            <button
              type="button"
              aria-pressed={!equippedEyes}
              aria-label="No eyes"
              onClick={onClearEyes}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5 ${
                !equippedEyes
                  ? "border-primary bg-primary/20 text-primary shadow-xs font-bold ring-1 ring-primary"
                  : "border-transparent bg-base-100/60 hover:bg-base-100 text-base-content/60"
              }`}
            >
              <div className="size-11 rounded-lg bg-base-300 flex items-center justify-center">
                <Icon icon={Prohibit} size="lg" className="text-base-content/40" />
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
                  onClick={() => onWearEyes(eye.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center gap-1.5 group ${
                    isSelected
                      ? "border-primary bg-primary/20 shadow-sm ring-1 ring-primary"
                      : "border-transparent bg-base-100/60 hover:bg-base-100 hover:scale-[1.02] active:scale-[0.96]"
                  }`}
                >
                  <div className="size-11 rounded-lg bg-base-300/80 flex items-center justify-center overflow-hidden border border-white/5">
                    <img
                      src={eyeThumbUrl(eye)}
                      alt=""
                      className="size-8 [image-rendering:pixelated] group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-xs font-extrabold truncate max-w-full">
                    {eye.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Eye height dock — pinned to the bottom of the scrollport so it's
            always reachable, even with the eyes grid scrolled down */}
        {equippedEyes ? (
          <div className="studio-eye-dock sticky bottom-0 z-10 bg-base-200 pt-2 pb-1 -mb-1">
            <div className="rounded-[10px] bg-base-300/85 p-3 shadow-xs border border-white/5">
              <div className="flex items-center justify-between text-xs mb-1.5 min-h-5">
                <span className="font-extrabold text-base-content/60 flex items-center gap-1.5">
                  <Icon icon={SlidersHorizontal} size="xs" className="text-base-content/40" />
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
                    <Icon icon={ArrowCounterClockwise} size="xs" />
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
                  onChange={(event) => onEyeOffset?.(Number(event.target.value))} />
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
