import { useRef } from "react"
import {
  CaretDown,
  Clock,
  Eye,
  Fire,
  Footprints,
  HardHat,
  Heart,
  Hoodie,
  Pants,
  PuzzlePiece,
  Scissors,
  Smiley,
  SquaresFour,
  Stack,
  TShirt,
  User,
  Users,
} from "@phosphor-icons/react"
import { CLOTHING_SLOTS, SLOT_LABEL } from "../../data/catalog"
import { SORTS, type SlotFilter, type Sort } from "../../lib/exploreBrowse"
import type { LookModelFilter, LookSort } from "../../state/publicLooks"
import { RailList } from "../../components/ui/RailList"
import { Icon, type IconType } from "../../components/ui/Icon"

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
  coat: Hoodie,
  pants: Pants,
  shoes: Footprints,
}

const MODEL_ITEMS: { id: LookModelFilter; icon: IconType; label: string }[] = [
  { id: "all", icon: Stack, label: "All models" },
  { id: "classic", icon: User, label: "Classic (4px)" },
  { id: "slim", icon: User, label: "Slim (3px)" },
]

export function ExploreRail({
  mode = "pieces",
  onModeChange,
  sort,
  slot,
  lookSort = "Trending",
  model = "all",
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
      <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/65">
        Show
      </p>
      <div
        className={`tactile-segment-track ${mode === "looks" ? "on-right" : ""}`}
        role="tablist"
        aria-label="Browse filter"
      >
        <span className="tactile-segment-thumb" aria-hidden />
        <button
          type="button"
          role="tab"
          aria-selected={mode === "pieces"}
          className={`tactile-segment-tab ${mode === "pieces" ? "tactile-segment-tab-on" : ""}`}
          onClick={() => onModeChange("pieces")}
        >
          <Icon icon={TShirt} size="xs" className="shrink-0" />
          <span>Pieces</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "looks"}
          className={`tactile-segment-tab ${mode === "looks" ? "tactile-segment-tab-on" : ""}`}
          onClick={() => onModeChange("looks")}
        >
          <Icon icon={SquaresFour} size="xs" className="shrink-0" />
          <span>Looks</span>
        </button>
      </div>
    </div>
  ) : null

  if (mode === "looks") {
    return (
      <aside className="explore-rail p-1">
        {modeFilterHeader}

        <div className="explore-rail-sticky">
          <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/65">
            Sort by
          </p>
          <RailList
            label="Sort by"
            selected={lookSort}
            onPick={(id: LookSort) => onLookSort?.(id)}
            items={LOOK_SORTS.map((item) => ({
              id: item,
              icon: LOOK_SORT_ICON[item],
              label: item,
            }))} />

          <p className="mb-2 mt-5 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/65">
            Skin model
          </p>
          <details ref={combo} className="cat-combo lg:hidden">
            <summary className="rail-row rail-row-on">
              <Icon icon={currentModel.icon} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{currentModel.label}</span>
              <Icon icon={CaretDown} size="xs" className="cat-chevron shrink-0 opacity-80" />
            </summary>
            <div className="cat-combo-panel">
              <RailList
                label="Skin model"
                selected={model}
                onPick={(id: LookModelFilter) => {
                  onModel?.(id)
                  combo.current?.removeAttribute("open")
                }}
                items={MODEL_ITEMS} />
            </div>
          </details>
          <div className="max-lg:hidden">
            <RailList
              label="Skin model"
              selected={model}
              onPick={(id: LookModelFilter) => onModel?.(id)}
              items={MODEL_ITEMS} />
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="explore-rail p-1">
      {modeFilterHeader}

      <div className="explore-rail-sticky">
        <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/65">
          Sort by
        </p>
        <RailList
          label="Sort by"
          selected={sort}
          onPick={(s: Sort) => onSort(s)}
          items={SORTS.map((item) => ({
            id: item,
            icon: PIECE_SORT_ICON[item],
            label: item,
          }))} />

        <p className="mb-2 mt-5 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/65">
          Categories
        </p>
        <details ref={combo} className="cat-combo lg:hidden">
          <summary className="rail-row rail-row-on">
            <Icon icon={SLOT_ICON[currentSlot.id]} size="sm" className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{currentSlot.label}</span>
            <Icon icon={CaretDown} size="xs" className="cat-chevron shrink-0 opacity-80" />
          </summary>
          <div className="cat-combo-panel">
            <RailList
              label="Categories"
              selected={slot}
              onPick={(id: SlotFilter) => {
                onSlot(id)
                combo.current?.removeAttribute("open")
              }}
              items={layers.map((item) => ({
                id: item.id,
                icon: SLOT_ICON[item.id],
                label: item.label,
              }))} />
          </div>
        </details>
        <div className="max-lg:hidden">
          <RailList
            label="Categories"
            selected={slot}
            onPick={(s: SlotFilter) => onSlot(s)}
            items={layers.map((item) => ({
              id: item.id,
              icon: SLOT_ICON[item.id],
              label: item.label,
            }))} />
        </div>
      </div>
    </aside>
  )
}
