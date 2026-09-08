import { useMemo, useState, type CSSProperties } from "react"
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import { SLOTS, SLOT_LABEL, type Piece } from "../../data/catalog"
import { FaIcon } from "../../components/FaIcon"
import { PieceTile } from "../../components/PieceTile"
import { RackGrid } from "../../components/RackGrid"
import type { LayerFilter } from "../../components/ClosetRail"
import { MAX_LIMITS } from "../../lib/sanitize"
import { filterClosetPieces } from "../closetBrowse"
import { WardrobeEmpty } from "./WardrobeEmpty"

export function WardrobePiecesPanel({ ownedPieces }: { ownedPieces: Piece[] }) {
  const [query, setQuery] = useState("")
  const [layer, setLayer] = useState<LayerFilter>("all")

  const filteredOwned = useMemo(
    () => filterClosetPieces(ownedPieces, query, layer, "Newest"),
    [layer, ownedPieces, query],
  )

  return (
    <div role="tabpanel">
      {ownedPieces.length === 0 ? (
        <WardrobeEmpty
          title="Closet’s still empty"
          body="Add a hat, a coat, or an accessory in Explore to build your wardrobe."
          to="/"
          cta="Explore pieces"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="listbox"
              aria-label="Filter by layer"
            >
              <button
                type="button"
                className={`btn btn-sm rounded-full font-extrabold ${layer === "all" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setLayer("all")}
              >
                All
              </button>
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`btn btn-sm rounded-full font-extrabold ${layer === slot ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setLayer(slot)}
                >
                  {SLOT_LABEL[slot]}
                </button>
              ))}
            </div>
            <div className="w-full sm:max-w-xs">
              <label className="input input-bordered flex h-10 items-center gap-2 rounded-full bg-base-100">
                <FaIcon icon={faMagnifyingGlass} className="size-3.5 opacity-50" />
                <input
                  type="search"
                  maxLength={MAX_LIMITS.SEARCH_QUERY}
                  className="grow border-none bg-transparent text-sm shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
                  placeholder="Search clothing..."
                  aria-label="Search clothing"
                  value={query}
                  onChange={(event) => setQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))}
                />
              </label>
            </div>
          </div>

          {filteredOwned.length === 0 ? (
            <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-12 text-center">
              <p className="text-base font-extrabold">Nothing in this rack</p>
              <p className="mt-1 text-sm text-base-content/65">
                No owned pieces match the selected filter.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-4 rounded-full font-extrabold"
                onClick={() => {
                  setQuery("")
                  setLayer("all")
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <RackGrid>
              {filteredOwned.map((piece, i) => (
                <div
                  key={piece.id}
                  className="rack-cell"
                  style={{ "--i": Math.min(i, 9) } as CSSProperties}
                >
                  <PieceTile piece={piece} action="wear" />
                </div>
              ))}
            </RackGrid>
          )}
        </div>
      )}
    </div>
  )
}
