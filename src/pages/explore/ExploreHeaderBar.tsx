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

  return (
    <section
      id="wardrobe"
      className="flex flex-col gap-4 rounded-[18px] bg-base-200 p-5 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          {isPieces ? "Browse all pieces" : "Browse community looks"}
        </h2>
        <p className="text-sm font-medium text-base-content/60">
          {isPieces ? (
            <>
              <span className="tabular-nums">{pieceCount}</span> items
              {slot === "all" ? " available" : ` · ${SLOT_LABEL[slot]}`}
            </>
          ) : (
            <>
              <span className="tabular-nums">{lookCount}</span> looks published
              {lookModel === "all"
                ? ""
                : ` · ${lookModel === "slim" ? "Slim 3px" : "Classic 4px"}`}
            </>
          )}
        </p>
      </div>

      <div className="flex w-full max-w-md items-center gap-2">
        <label className="input input-bordered flex h-11 grow items-center gap-2 rounded-full bg-base-100">
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
          className="btn btn-primary btn-sm sm:btn-md rounded-full font-bold gap-2 shrink-0 px-3.5 sm:px-4 shadow-sm active:scale-[0.96] transition-transform"
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
