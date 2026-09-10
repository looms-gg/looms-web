import { MagnifyingGlass } from "@phosphor-icons/react"
import { SLOTS, SLOT_LABEL } from "../../data/catalog"
import type { SlotFilter } from "../../lib/exploreBrowse"
import { Icon } from "../../components/ui/Icon"
import { MAX_LIMITS } from "../../lib/sanitize"

export function WardrobeFilterBar({
  slot,
  onSlot,
  query,
  onQuery,
  listLabel,
  searchLabel,
  searchPlaceholder,
}: {
  slot: SlotFilter
  onSlot: (slot: SlotFilter) => void
  query: string
  onQuery: (query: string) => void
  listLabel: string
  searchLabel: string
  searchPlaceholder: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5" role="listbox" aria-label={listLabel}>
        <button
          type="button"
          className={`btn btn-sm rounded-full font-extrabold ${slot === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => onSlot("all")}
        >
          All
        </button>
        {SLOTS.map((id) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm rounded-full font-extrabold ${slot === id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onSlot(id)}
          >
            {SLOT_LABEL[id]}
          </button>
        ))}
      </div>
      <div className="w-full sm:max-w-xs">
        <label className="input input-bordered flex h-10 items-center gap-2 rounded-full bg-base-100">
          <Icon icon={MagnifyingGlass} className="size-3.5 opacity-50" />
          <input
            type="search"
            maxLength={MAX_LIMITS.SEARCH_QUERY}
            className="grow border-none bg-transparent text-sm shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            value={query}
            onChange={(event) => onQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))}
          />
        </label>
      </div>
    </div>
  )
}

export function WardrobeEmptyRack({
  body,
  onReset,
}: {
  body: string
  onReset: () => void
}) {
  return (
    <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-12 text-center">
      <p className="text-base font-extrabold">Nothing in this rack</p>
      <p className="mt-1 text-sm text-base-content/65">{body}</p>
      <button
        type="button"
        className="btn btn-primary btn-sm mt-4 rounded-full font-extrabold"
        onClick={onReset}
      >
        Reset filters
      </button>
    </div>
  )
}
