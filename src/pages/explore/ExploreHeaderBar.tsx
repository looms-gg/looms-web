import { CloudArrowUp, MagnifyingGlass, PaintBrush } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { MAX_LIMITS } from "../../lib/sanitize"
import { SLOT_LABEL } from "../../data/catalog"
import type { SlotFilter } from "../../lib/exploreBrowse"
import type { LookModelFilter } from "../../state/publicLooks"

interface ExploreHeaderBarProps {
  mode: "pieces" | "looks"
  pieceCount: number
  lookCount: number
  slot: SlotFilter
  lookModel: LookModelFilter
  query: string
  onQueryChange: (query: string) => void
  onActionClick: () => void
}

export function ExploreHeaderBar({
  mode,
  pieceCount,
  lookCount,
  slot,
  lookModel,
  query,
  onQueryChange,
  onActionClick,
}: ExploreHeaderBarProps) {
  const isPieces = mode === "pieces"
  const count = isPieces ? pieceCount : lookCount
  const scope = isPieces
    ? slot === "all"
      ? "pieces available"
      : `pieces · ${SLOT_LABEL[slot]}`
    : lookModel === "all"
      ? "looks published"
      : `looks · ${lookModel === "slim" ? "Slim 3px" : "Classic 4px"}`

  return (
    <section id="wardrobe" className="explore-toolbar">
      <div className="explore-toolbar-id">
        <h2 className="explore-toolbar-title">
          {isPieces ? "Browse all pieces" : "Browse community looks"}
        </h2>
        <p className="explore-toolbar-meta">
          <span className="explore-toolbar-count tabular-nums">{count}</span>
          <span>{scope}</span>
        </p>
      </div>

      <div className="explore-toolbar-actions">
        <label className="input input-bordered flex h-11 grow items-center gap-2 bg-base-100">
          <Icon icon={MagnifyingGlass} size="sm" className="opacity-50" />
          <input
            type="search"
            maxLength={MAX_LIMITS.SEARCH_QUERY}
            className="grow border-none bg-transparent shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
            placeholder={isPieces ? "Search clothing..." : "Search looks or creators..."}
            aria-label={isPieces ? "Search clothing" : "Search looks"}
            value={query}
            onChange={(event) =>
              onQueryChange(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))
            }
          />
        </label>

        <button
          type="button"
          className="btn btn-primary !h-11 font-bold gap-2 shrink-0 px-3.5 sm:px-4"
          onClick={onActionClick}
        >
          <Icon icon={isPieces ? CloudArrowUp : PaintBrush} size="sm" />
          <span className="hidden sm:inline">
            {isPieces ? "Upload Piece" : "Open Studio"}
          </span>
        </button>
      </div>
    </section>
  )
}
