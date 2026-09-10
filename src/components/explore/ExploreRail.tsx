import { useRef } from "react"
import {
  CaretDown,
  Clock,
  Crown,
  Eye,
  Fire,
  Footprints,
  HardHat,
  Heart,
  Pants,
  PuzzlePiece,
  Scissors,
  Smiley,
  Sparkle,
  Stack,
  TShirt,
  User,
  Users,
} from "@phosphor-icons/react"
import { CLOTHING_SLOTS, SLOT_LABEL } from "../../data/catalog"
import { SORTS, type SlotFilter, type Sort } from "../../lib/exploreBrowse"
import type { LookModelFilter, LookSort } from "../../state/publicLooks"
import { Icon, type IconType } from "../ui/Icon"

const PIECE_SORT_ICON: Record<Sort, IconType> = {
  Newest: Clock,
  Trending: Fire,
  "Most Saved": Users,
}

const LOOK_SORT_ICON: Record<LookSort, IconType> = {
  Trending: Fire,
  Popular: Heart,
  Newest: Clock,
}

const LOOK_SORTS: LookSort[] = ["Trending", "Popular", "Newest"]

const SLOT_ICON: Record<SlotFilter, IconType> = {
  all: Stack,
  eyes: Eye,
  hair: Scissors,
  hat: HardHat,
  face: Smiley,
  shirt: TShirt,
  set: PuzzlePiece,
  coat: Crown,
  pants: Pants,
  shoes: Footprints,
}

const MODEL_ITEMS: { id: LookModelFilter; icon: IconType; label: string }[] = [
  { id: "all", icon: Stack, label: "All models" },
  { id: "classic", icon: User, label: "Classic (4px)" },
  { id: "slim", icon: User, label: "Slim (3px)" },
]

function RailList<T extends string>({
  label,
  items,
  selected,
  onPick,
}: {
  label: string
  items: { id: T; icon: IconType; label: string }[]
  selected: T
  onPick: (id: T) => void
}) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === selected),
  )

  return (
    <div role="listbox" aria-label={label} className="rail-list">
      <span
        className="rail-thumb"
        aria-hidden
        style={{ transform: `translateY(${index * 100}%)` }}
      />
      {items.map((item) => {
        const on = item.id === selected
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={on}
            onClick={() => onPick(item.id)}
            className={`rail-row ${on ? "rail-row-on" : ""}`}
          >
            <Icon icon={item.icon} className="size-3.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ExploreRail({
  mode = "pieces",
  onModeChange,
  sort,
  slot,
  lookSort = "Trending",
  model = "all",
  pieceCount = 0,
  lookCount = 0,
  onSort,
  onSlot,
  onLookSort,
  onModel,
}: {
  mode?: "pieces" | "looks"
  onModeChange?: (mode: "pieces" | "looks") => void
  sort: Sort
  slot: SlotFilter
  lookSort?: LookSort
  model?: LookModelFilter
  pieceCount?: number
  lookCount?: number
  onSort: (sort: Sort) => void
  onSlot: (slot: SlotFilter) => void
  onLookSort?: (sort: LookSort) => void
  onModel?: (model: LookModelFilter) => void
}) {
  const layers: { id: SlotFilter; label: string }[] = [
    { id: "all", label: "All clothes" },
    ...CLOTHING_SLOTS.map((slot) => ({ id: slot, label: SLOT_LABEL[slot] })),
  ]
  const currentSlot = layers.find((item) => item.id === slot) ?? layers[0]
  const currentModel = MODEL_ITEMS.find((item) => item.id === model) ?? MODEL_ITEMS[0]
  const combo = useRef<HTMLDetailsElement>(null)

  const modeFilterHeader = onModeChange ? (
    <div className="mb-4">
      <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
        Show
      </p>
      <div
        className="grid grid-cols-2 gap-1 rounded-xl bg-base-300/80 p-1"
        role="tablist"
        aria-label="Browse filter"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pieces"}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all active:scale-[0.96] ${
            mode === "pieces"
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/70 hover:text-base-content"
          }`}
          onClick={() => onModeChange("pieces")}
        >
          <Icon icon={TShirt} className="size-3" />
          <span>Pieces</span>
          {pieceCount > 0 ? (
            <span className="opacity-65 tabular-nums text-[10px]">({pieceCount})</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "looks"}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all active:scale-[0.96] ${
            mode === "looks"
              ? "bg-primary text-primary-content shadow-sm"
              : "text-base-content/70 hover:text-base-content"
          }`}
          onClick={() => onModeChange("looks")}
        >
          <Icon icon={Sparkle} className="size-3" />
          <span>Looks</span>
          {lookCount > 0 ? (
            <span className="opacity-65 tabular-nums text-[10px]">({lookCount})</span>
          ) : null}
        </button>
      </div>
    </div>
  ) : null

  if (mode === "looks") {
    return (
      <aside className="plaza-panel explore-rail h-fit self-start rounded-[18px] p-3">
        {modeFilterHeader}

        <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
          Sort by
        </p>
        <RailList
          label="Sort by"
          selected={lookSort}
          onPick={(id) => onLookSort?.(id)}
          items={LOOK_SORTS.map((item) => ({
            id: item,
            icon: LOOK_SORT_ICON[item],
            label: item,
          }))}
        />

        <p className="mb-2 mt-5 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
          Skin model
        </p>
        <details ref={combo} className="cat-combo lg:hidden">
          <summary className="rail-row rail-row-on">
            <Icon icon={currentModel.icon} className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{currentModel.label}</span>
            <Icon icon={CaretDown} className="cat-chevron size-3 shrink-0 opacity-80" />
          </summary>
          <div className="cat-combo-panel">
            <RailList
              label="Skin model"
              selected={model}
              onPick={(id) => {
                onModel?.(id)
                combo.current?.removeAttribute("open")
              }}
              items={MODEL_ITEMS}
            />
          </div>
        </details>
        <div className="max-lg:hidden">
          <RailList
            label="Skin model"
            selected={model}
            onPick={(id) => onModel?.(id)}
            items={MODEL_ITEMS}
          />
        </div>
      </aside>
    )
  }

  return (
    <aside className="plaza-panel explore-rail h-fit self-start rounded-[18px] p-3">
      {modeFilterHeader}

      <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
        Sort by
      </p>
      <RailList
        label="Sort by"
        selected={sort}
        onPick={onSort}
        items={SORTS.map((item) => ({
          id: item,
          icon: PIECE_SORT_ICON[item],
          label: item,
        }))}
      />

      <p className="mb-2 mt-5 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
        Categories
      </p>
      <details ref={combo} className="cat-combo lg:hidden">
        <summary className="rail-row rail-row-on">
          <Icon icon={SLOT_ICON[currentSlot.id]} className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{currentSlot.label}</span>
          <Icon icon={CaretDown} className="cat-chevron size-3 shrink-0 opacity-80" />
        </summary>
        <div className="cat-combo-panel">
          <RailList
            label="Categories"
            selected={slot}
            onPick={(id) => {
              onSlot(id)
              combo.current?.removeAttribute("open")
            }}
            items={layers.map((item) => ({
              id: item.id,
              icon: SLOT_ICON[item.id],
              label: item.label,
            }))}
          />
        </div>
      </details>
      <div className="max-lg:hidden">
        <RailList
          label="Categories"
          selected={slot}
          onPick={onSlot}
          items={layers.map((item) => ({
            id: item.id,
            icon: SLOT_ICON[item.id],
            label: item.label,
          }))}
        />
      </div>
    </aside>
  )
}
