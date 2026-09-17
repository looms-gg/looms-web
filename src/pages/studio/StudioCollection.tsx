import { Link } from "react-router-dom"
import {
  ArrowCounterClockwise,
  BaseballCap,
  Check,
  Dress,
  Eye,
  Hoodie,
  Pants,
  Prohibit,
  SlidersHorizontal,
  Smiley,
  Sneaker,
  Sparkle,
  SquaresFour,
  TShirt,
} from "@phosphor-icons/react"
import {
  COLLECTION_CATEGORY_ORDER,
  SLOT_LABEL,
  type Piece,
  type Slot,
} from "../../data/catalog"
import type { Equipped } from "../../data/outfit"
import {
  bundledEyes,
  EYE_OFFSET_MAX,
  EYE_OFFSET_MIN,
  eyeThumbUrl,
  parseEyeId,
} from "../../data/eyes"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { RailList } from "../../components/ui/RailList"
import { Icon, type IconType } from "../../components/ui/Icon"

const SLOT_ICONS: Record<Slot, IconType> = {
  eyes: Eye,
  hair: Sparkle,
  hat: BaseballCap,
  face: Smiley,
  shirt: TShirt,
  set: Dress,
  coat: Hoodie,
  pants: Pants,
  shoes: Sneaker,
}

function PieceCard({
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
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Take off ${piece.name}` : `Wear ${piece.name}`}
      onClick={() => (on ? onClear(piece.slot) : onWear(piece.id))}
      className={`studio-piece group relative flex aspect-[3/4] min-h-[145px] cursor-pointer flex-col justify-between rounded-2xl border p-0 text-center transition-all select-none overflow-hidden ${
        on
          ? "border-primary bg-base-300/60 shadow-xs ring-1 ring-primary/40"
          : "border-base-content/8 bg-base-300/40 hover:border-base-content/15 hover:bg-base-300/70 hover:scale-[1.02] active:scale-[0.97]"
      }`}
    >
      {on ? (
        <span
          className="absolute top-2 right-2 z-20 flex size-6 items-center justify-center rounded-full bg-primary text-primary-content shadow-xs"
          aria-hidden="true"
        >
          <Icon icon={Check} size="xs" />
        </span>
      ) : null}
      {on ? <span className="sr-only">Worn</span> : null}

      <div className="studio-piece-media relative flex-1 w-full min-h-0 overflow-hidden">
        <IsoThumb
          piece={piece}
          alt=""
          className="w-full h-full"
        />
      </div>

      <div className="studio-piece-brow">
        <p className="truncate text-xs font-extrabold text-base-content leading-tight">
          {piece.name}
        </p>
        <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-base-content/40">
          {SLOT_LABEL[piece.slot]}
        </p>
      </div>
    </button>
  )
}

export function StudioCollection({
  ownedCount,
  ownedBySlot,
  racks,
  category,
  onCategory,
  equipped,
  onWear,
  onClear,
  equippedEyes,
  eyeOffset = 0,
  onEyeOffset,
}: {
  ownedCount: number
  ownedBySlot: Record<Slot, Piece[]>
  racks: Slot[]
  category: "all" | Slot
  onCategory: (cat: "all" | Slot) => void
  equipped: Equipped
  onWear: (id: string) => void
  onClear: (slot: Slot) => void
  equippedEyes?: string
  eyeOffset?: number
  onEyeOffset?: (offset: number) => void
}) {
  // Category tabs: All, followed by available category slots in strict COLLECTION_CATEGORY_ORDER.
  // Eyes is always available (bundled presets). Garment slots appear if present in racks.
  const categorySlots = COLLECTION_CATEGORY_ORDER.filter(
    (slot) => slot === "eyes" || racks.includes(slot),
  )
  const filledGarmentSlots = COLLECTION_CATEGORY_ORDER.filter(
    (slot) => slot !== "eyes" && racks.includes(slot),
  )
  const shownSlots = category === "all" ? filledGarmentSlots : filledGarmentSlots.filter((s) => s === category)
  const isEyesCategory = category === "eyes"
  const isEmptyAll = category === "all" && ownedCount === 0
  const isEmptyCategory =
    !isEyesCategory &&
    category !== "all" &&
    (ownedBySlot[category as Slot]?.length ?? 0) === 0

  return (
    <div className="studio-collection-group">
      {/* Category rail, same dock-and-keycap rail as the home page */}
      <nav
        className="studio-category-rail"
        data-testid="studio-collection-tabs"
      >
        <RailList
          variant="tiles"
          label="Piece categories"
          selected={category}
          onPick={onCategory}
          items={[
            { id: "all", icon: SquaresFour, label: "All" },
            ...categorySlots.map((slot) => ({
              id: slot,
              icon: SLOT_ICONS[slot],
              label: SLOT_LABEL[slot],
            })),
          ]} />
      </nav>

      <aside className="studio-wardrobe flex-1 min-w-0 rounded-2xl bg-base-200 border border-base-content/10 p-4">
        <div className="studio-wardrobe-head">
          <h2 className="text-xs font-black uppercase tracking-[0.08em] text-base-content/70">Collection</h2>
        </div>

      <div className="studio-wardrobe-body">
        {isEmptyAll ? (
          <div className="mt-4 grid flex-1 place-items-center rounded-2xl border border-dashed border-base-content/15 px-3 py-8 text-center">
            <p className="font-extrabold">Wardrobe's still empty.</p>
            <p className="mt-1 text-sm text-base-content/65">
              Find pieces in Explore.
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-[180px]">
              <Link to="/" className="btn btn-primary rounded-xl font-extrabold btn-sm">
                Explore pieces
              </Link>
            </div>
          </div>
        ) : isEmptyCategory ? (
          <div className="mt-4 grid flex-1 place-items-center rounded-2xl border border-dashed border-base-content/15 px-3 py-8 text-center">
            <p className="font-extrabold">
              No {SLOT_LABEL[category as Slot].toLowerCase()} here yet.
            </p>
            <p className="mt-1 text-sm text-base-content/65">
              Find pieces in Explore.
            </p>
            <div className="mt-4 flex flex-col gap-2 w-full max-w-[180px]">
              <Link to="/" className="btn btn-primary rounded-xl font-extrabold btn-sm">
                Explore pieces
              </Link>
            </div>
          </div>
        ) : isEyesCategory ? (
          <div className="studio-wardrobe-clip flex flex-col">
            <div className="studio-wardrobe-list space-y-3">
              <div className="grid grid-cols-2 gap-2.5 pb-6">
                {/* Default (none) option */}
                <button
                  type="button"
                  aria-pressed={!equippedEyes}
                  aria-label="No eyes"
                  onClick={() => onClear("eyes")}
                  className={`studio-piece group relative flex aspect-[3/4] min-h-[145px] cursor-pointer flex-col justify-between rounded-2xl border p-0 text-center transition-all select-none overflow-hidden ${
                    !equippedEyes
                      ? "border-primary bg-base-300/60 shadow-xs ring-1 ring-primary/40"
                      : "border-base-content/8 bg-base-300/40 hover:border-base-content/15 hover:bg-base-300/70 hover:scale-[1.02] active:scale-[0.97]"
                  }`}
                >
                  {!equippedEyes ? (
                    <span
                      className="absolute top-2 right-2 z-20 flex size-6 items-center justify-center rounded-full bg-primary text-primary-content shadow-xs"
                      aria-hidden="true"
                    >
                      <Icon icon={Check} size="xs" />
                    </span>
                  ) : null}
                  {!equippedEyes ? <span className="sr-only">Worn</span> : null}

                  <div className="studio-piece-media relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
                    <div className="size-11 rounded-xl bg-base-300/80 flex items-center justify-center border border-base-content/10 shadow-xs">
                      <Icon icon={Prohibit} size="md" className="text-base-content/40" />
                    </div>
                  </div>

                  <div className="studio-piece-brow">
                    <p className="truncate text-xs font-extrabold text-base-content leading-tight">Default</p>
                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-base-content/40">
                      Eyes
                    </p>
                  </div>
                </button>

                {/* Bundled eye cards */}
                {bundledEyes.map((eye) => {
                  const isWorn = equippedEyes
                    ? parseEyeId(equippedEyes).baseId === eye.id
                    : false
                  return (
                    <button
                      key={eye.id}
                      type="button"
                      aria-pressed={isWorn}
                      aria-label={isWorn ? `Take off ${eye.name}` : `Wear ${eye.name}`}
                      onClick={() => (isWorn ? onClear("eyes") : onWear(eye.id))}
                      className={`studio-piece group relative flex aspect-[3/4] min-h-[145px] cursor-pointer flex-col justify-between rounded-2xl border p-0 text-center transition-all select-none overflow-hidden ${
                        isWorn
                          ? "border-primary bg-base-300/60 shadow-xs ring-1 ring-primary/40"
                          : "border-base-content/8 bg-base-300/40 hover:border-base-content/15 hover:bg-base-300/70 hover:scale-[1.02] active:scale-[0.97]"
                      }`}
                    >
                      {isWorn ? (
                        <span
                          className="absolute top-2 right-2 z-20 flex size-6 items-center justify-center rounded-full bg-primary text-primary-content shadow-xs"
                          aria-hidden="true"
                        >
                          <Icon icon={Check} size="xs" />
                        </span>
                      ) : null}
                      {isWorn ? <span className="sr-only">Worn</span> : null}

                      <div className="studio-piece-media relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
                        <img
                          src={eyeThumbUrl(eye)}
                          alt=""
                          className="size-11 [image-rendering:pixelated] group-hover:scale-115 transition-transform drop-shadow-sm"
                        />
                      </div>

                      <div className="studio-piece-brow">
                        <p className="truncate text-xs font-extrabold text-base-content leading-tight">{eye.name}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-base-content/40">
                          Eyes
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sticky eye-height dock: appears only when eyes are equipped and category is active */}
            {equippedEyes ? (
              <div className="studio-eye-dock sticky bottom-0 z-10 bg-base-200 pt-2 pb-1 -mb-1">
                <div className="rounded-[10px] bg-base-300/85 p-3 shadow-xs border border-base-content/8">
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
                      onChange={(event) => onEyeOffset?.(Number(event.target.value))}
                    />
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="studio-wardrobe-clip">
            <div className="studio-wardrobe-list">
              <div className="grid grid-cols-2 gap-2.5 pb-6">
                {(category === "all"
                  ? shownSlots.flatMap((slot) => ownedBySlot[slot])
                  : ownedBySlot[category as Slot] ?? []
                ).map((piece) => (
                  <PieceCard
                    key={piece.id}
                    piece={piece}
                    on={equipped[piece.slot] === piece.id}
                    onWear={onWear}
                    onClear={onClear}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  </div>
)
}

