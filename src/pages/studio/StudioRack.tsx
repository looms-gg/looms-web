import { useState } from "react"
import { Link } from "react-router-dom"
import { MagnifyingGlass, Palette, X } from "@phosphor-icons/react"
import {
  SLOT_LABEL,
  type Piece,
  type Slot,
} from "../../data/catalog"
import type { Equipped } from "../../data/outfit"
import { bodies as defaultBodies, type Body } from "../../data/bodies"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { Icon } from "../../components/ui/Icon"
import { MAX_LIMITS } from "../../lib/sanitize"
import type { StudioRackTab } from "./studioOwned"
import { StudioAppearancePanel } from "./StudioAppearancePanel"

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
        className={`studio-piece studio-piece-row flex w-full items-center gap-3 rounded-[10px] p-2 text-left cursor-pointer ${
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
  const [pieceSearchOpen, setPieceSearchOpen] = useState(false)
  const [pieceQuery, setPieceQuery] = useState("")

  const shownSlots = rack === "all" ? racks : racks.filter((slot) => slot === rack)
  const hasOwned = ownedCount > 0
  const isAppearance = rack === "appearance"
  const query = pieceQuery.trim().toLowerCase()
  const searching = !isAppearance && pieceSearchOpen && query.length > 0
  const matchesQuery = (piece: Piece) =>
    piece.name.toLowerCase().includes(query) ||
    piece.id.toLowerCase().includes(query) ||
    SLOT_LABEL[piece.slot].toLowerCase().includes(query)
  const searchSlots = searching
    ? racks
        .map((slot) => ({
          slot,
          pieces: ownedBySlot[slot].filter(matchesQuery),
        }))
        .filter((group) => group.pieces.length > 0)
    : []

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
            <Icon
              icon={Palette}
              className={
                isAppearance ? "text-primary" : "text-base-content/40"
              } />
            Appearance
          </button>
        </div>

        {/* Sub-category pills for Pieces. The searcher overlays this row in
            place instead of replacing it, so toggling search never shifts the
            surrounding layout. */}
        {!isAppearance && hasOwned ? (
          <div className="relative">
            <div
              className={`studio-wardrobe-tabs ${
                pieceSearchOpen ? "invisible" : ""
              }`}
              data-testid="studio-wardrobe-tabs"
              aria-hidden={pieceSearchOpen || undefined}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                  e.currentTarget.scrollLeft += e.deltaY
                }
              }}
            >
              <button
                type="button"
                tabIndex={pieceSearchOpen ? -1 : 0}
                className={`badge h-8 shrink-0 rounded-full border-0 px-3 font-bold cursor-pointer ${
                  rack === "all" ? "badge-primary" : "badge-neutral"
                }`}
                onClick={() => onRack("all")}
              >
                All
              </button>
              <button
                type="button"
                aria-label="Search pieces"
                title="Search pieces"
                tabIndex={pieceSearchOpen ? -1 : 0}
                className="badge badge-neutral h-8 shrink-0 rounded-full border-0 px-2.5 font-bold cursor-pointer hover:bg-base-content/20"
                onClick={() => setPieceSearchOpen(true)}
              >
                <Icon icon={MagnifyingGlass} size="sm" />
              </button>
              {racks.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  tabIndex={pieceSearchOpen ? -1 : 0}
                  className={`badge h-8 shrink-0 rounded-full border-0 px-3 font-bold cursor-pointer ${
                    rack === slot ? "badge-primary" : "badge-neutral"
                  }`}
                  onClick={() => onRack(slot)}
                >
                  {SLOT_LABEL[slot]}
                </button>
              ))}
            </div>
            {pieceSearchOpen ? (
              <div
                className="studio-piece-search-pop absolute inset-x-0 top-1 z-20 flex h-8 items-center"
                data-testid="studio-piece-search"
              >
                {/* Same pill-search pattern as Explore and the Wardrobe:
                    label.input wrapper with the icon inside. */}
                <label className="input input-bordered flex h-8 w-full items-center gap-2 rounded-full bg-base-100 pl-3">
                  <Icon icon={MagnifyingGlass} size="sm" className="shrink-0 opacity-50" />
                  <input
                    autoFocus
                    type="search"
                    maxLength={MAX_LIMITS.SEARCH_QUERY}
                    placeholder="Search pieces..."
                    aria-label="Search pieces"
                    value={pieceQuery}
                    onChange={(e) =>
                      setPieceQuery(e.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation()
                        setPieceSearchOpen(false)
                        setPieceQuery("")
                      }
                    }}
                    className="grow border-none bg-transparent text-xs font-medium shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0" />
                  {pieceQuery ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      title="Clear search"
                      className="shrink-0 cursor-pointer text-base-content/40 hover:text-base-content"
                      onClick={() => setPieceQuery("")}
                    >
                      <Icon icon={X} size="sm" />
                    </button>
                  ) : null}
                </label>
                <button
                  type="button"
                  aria-label="Close piece search"
                  title="Close search"
                  className="btn btn-ghost btn-xs h-8 min-h-0 shrink-0 rounded-full px-2 ml-1 text-base-content/50 hover:text-base-content"
                  onClick={() => {
                    setPieceSearchOpen(false)
                    setPieceQuery("")
                  }}
                >
                  <Icon icon={X} size="md" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="studio-wardrobe-body">
      {isAppearance ? (
        <StudioAppearancePanel
          bodies={bodies}
          body={body}
          bodyId={bodyId}
          bodyHue={bodyHue}
          bodyTint={bodyTint}
          hueOpen={hueOpen}
          equippedEyes={equippedEyes}
          eyeOffset={eyeOffset}
          onPickTone={onPickTone}
          onBodyHue={onBodyHue}
          onEyeOffset={onEyeOffset}
          onWearEyes={onWear}
          onClearEyes={() => onClear("eyes")} />
      ) : searching ? (
        <div className="studio-wardrobe-clip">
          {searchSlots.length === 0 ? (
            <div className="mt-4 grid flex-1 place-items-center rounded-[10px] border border-dashed border-base-content/15 px-3 py-8 text-center">
              <p className="font-extrabold">No pieces match</p>
              <p className="mt-1 text-sm text-base-content/65">
                Nothing in your wardrobe matches "{pieceQuery.trim()}".
              </p>
            </div>
          ) : (
            <div className="studio-wardrobe-list space-y-4">
              {searchSlots.map(({ slot, pieces }) => (
                <div key={slot}>
                  <p className="mb-2 text-sm font-bold text-base-content/55">
                    {SLOT_LABEL[slot]}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {pieces.map((piece) => (
                      <PieceRackRow
                        key={piece.id}
                        piece={piece}
                        on={equipped[slot] === piece.id}
                        onWear={onWear}
                        onClear={onClear} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : !hasOwned ? (
        <div className="mt-4 grid flex-1 place-items-center rounded-[10px] border border-dashed border-base-content/15 px-3 py-8 text-center">
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
              <Icon icon={Palette} size="sm" className="mr-1" />
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
                      onClear={onClear} />
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
