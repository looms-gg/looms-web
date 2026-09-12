import { MagnifyingGlass } from "@phosphor-icons/react"
import { SLOTS, SLOT_LABEL } from "../../data/catalog"
import type { SlotFilter } from "../../lib/exploreBrowse"
import { Icon } from "../../components/ui/Icon"
import { EmptyState } from "../../components/ui/EmptyState"
import { Button } from "../../components/ui/Button"
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
          className={`btn btn-sm btn-pill font-extrabold ${slot === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => onSlot("all")}
        >
          All
        </button>
        {SLOTS.map((id) => (
          <button
            key={id}
            type="button"
            className={`btn btn-sm btn-pill font-extrabold ${slot === id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => onSlot(id)}
          >
            {SLOT_LABEL[id]}
          </button>
        ))}
      </div>
      <div className="w-full sm:max-w-xs">
        <label className="input input-bordered flex h-10 items-center gap-2 rounded-full bg-base-100">
          <Icon icon={MagnifyingGlass} size="sm" className="opacity-50" />
          <input
            type="search"
            maxLength={MAX_LIMITS.SEARCH_QUERY}
            className="grow border-none bg-transparent text-sm shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            value={query}
            onChange={(event) => onQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))} />
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
    <EmptyState
      title="Nothing in this rack"
      body={body}
      action={
        <Button variant="primary" size="sm" className="mt-4 font-extrabold" onClick={onReset}>
          Reset filters
        </Button>
      }
    />
  )
}
