import { useRef } from "react"
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
import {
  faChevronDown,
  faClock,
  faEye,
  faFaceSmile,
  faFire,
  faHatWizard,
  faLayerGroup,
  faShirt,
  faShoePrints,
  faScissors,
  faSocks,
  faUsers,
  faVest,
} from "@fortawesome/free-solid-svg-icons"
import {
  CLOTHING_SLOTS,
  SLOT_LABEL,
  type Slot,
} from "../data/catalog"
import { FaIcon } from "./FaIcon"

export const SORTS = ["Newest", "Trending", "Most Saved"] as const
export type Sort = (typeof SORTS)[number]
export type LayerFilter = "all" | Slot

const SORT_ICON: Record<Sort, IconDefinition> = {
  Newest: faClock,
  Trending: faFire,
  "Most Saved": faUsers,
}

const SLOT_ICON: Record<LayerFilter, IconDefinition> = {
  all: faLayerGroup,
  eyes: faEye,
  hair: faScissors,
  hat: faHatWizard,
  face: faFaceSmile,
  shirt: faShirt,
  coat: faVest,
  pants: faSocks,
  shoes: faShoePrints,
}

function RailList<T extends string>({
  label,
  items,
  selected,
  onPick,
}: {
  label: string
  items: { id: T; icon: IconDefinition; label: string }[]
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
            <FaIcon icon={item.icon} className="size-3.5 shrink-0" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ClosetRail({
  sort,
  layer,
  onSort,
  onLayer,
}: {
  sort: Sort
  layer: LayerFilter
  onSort: (sort: Sort) => void
  onLayer: (layer: LayerFilter) => void
}) {
  const layers: { id: LayerFilter; label: string }[] = [
    { id: "all", label: "All clothes" },
    ...CLOTHING_SLOTS.map((slot) => ({ id: slot, label: SLOT_LABEL[slot] })),
  ]
  const current = layers.find((item) => item.id === layer) ?? layers[0]
  const combo = useRef<HTMLDetailsElement>(null)

  return (
    <aside className="plaza-panel closet-rail h-fit self-start rounded-[18px] p-3">
      <p className="mb-2 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
        Sort by
      </p>
      <RailList
        label="Sort by"
        selected={sort}
        onPick={onSort}
        items={SORTS.map((item) => ({
          id: item,
          icon: SORT_ICON[item],
          label: item,
        }))}
      />

      <p className="mb-2 mt-5 px-2 text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/55">
        Categories
      </p>
      <details ref={combo} className="cat-combo lg:hidden">
        <summary className="rail-row rail-row-on">
          <FaIcon icon={SLOT_ICON[current.id]} className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{current.label}</span>
          <FaIcon icon={faChevronDown} className="cat-chevron size-3 shrink-0 opacity-80" />
        </summary>
        <div className="cat-combo-panel">
          <RailList
            label="Categories"
            selected={layer}
            onPick={(id) => {
              onLayer(id)
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
          selected={layer}
          onPick={onLayer}
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
