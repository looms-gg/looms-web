import type { CSSProperties, ReactNode } from "react"
import type { Piece } from "../../data/catalog"
import type { SlotFilter, Sort } from "../../lib/exploreBrowse"
import type { LookModelFilter, LookSort, PublicLook } from "../../state/publicLooks"
import { PieceTile } from "../../components/piece/PieceTile"
import { LookTile } from "../../components/look/LookTile"
import { RackGrid } from "../../components/piece/RackGrid"

function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string
  body: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-16 text-center">
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-base-content/65">{body}</p>
      {action}
    </div>
  )
}

export function ExploreRack({
  mode = "pieces",
  loading,
  error,
  pieces,
  filtered,
  looks = [],
  filteredLooks = [],
  slot,
  sort,
  lookSort = "Trending",
  model = "all",
  query,
  onReset,
  onLookLikeCountChange,
}: {
  mode?: "pieces" | "looks"
  loading: boolean
  error: string | null
  pieces: Piece[]
  filtered: Piece[]
  looks?: PublicLook[]
  filteredLooks?: PublicLook[]
  slot: SlotFilter
  sort: Sort
  lookSort?: LookSort
  model?: LookModelFilter
  query: string
  onReset: () => void
  onLookLikeCountChange?: (lookId: string, count: number) => void
}) {
  if (mode === "looks") {
    if (loading && looks.length === 0) {
      return (
        <EmptyPanel title="Opening the wardrobe" body="Gathering community published looks." />
      )
    }
    if (error && looks.length === 0) {
      return <EmptyPanel title="Couldn't load looks" body={error} />
    }
    if (filteredLooks.length === 0) {
      return (
        <EmptyPanel
          title="No looks found"
          body="Try another search term or reset filters."
          action={
            <button
              type="button"
              className="btn btn-primary mt-4 rounded-full font-extrabold"
              onClick={onReset}
            >
              Reset filters
            </button>
          }
        />
      )
    }
    return (
      <RackGrid key={`looks:${model}:${lookSort}:${query}`}>
        {filteredLooks.map((look, i) => (
          <div
            key={look.id}
            className="rack-cell"
            style={{ "--i": Math.min(i, 9) } as CSSProperties}
          >
            <LookTile
              look={look}
              onLikeCountChange={(next) => onLookLikeCountChange?.(look.id, next)}
            />
          </div>
        ))}
      </RackGrid>
    )
  }

  if (loading && pieces.length === 0) {
    return (
      <EmptyPanel title="Opening the racks" body="Pulling pieces from Explore." />
    )
  }
  if (error && pieces.length === 0) {
    return <EmptyPanel title="Couldn't load Explore" body={error} />
  }
  if (filtered.length === 0) {
    return (
      <EmptyPanel
        title="Nothing in this rack"
        body="Try another category, or clear search."
        action={
          <button
            type="button"
            className="btn btn-primary mt-4 rounded-full font-extrabold"
            onClick={onReset}
          >
            Reset filters
          </button>
        }
      />
    )
  }
  return (
    <RackGrid key={`${slot}:${sort}:${query}`}>
      {filtered.map((piece, i) => (
        <div
          key={piece.id}
          className="rack-cell"
          style={{ "--i": Math.min(i, 9) } as CSSProperties}
        >
          <PieceTile piece={piece} />
        </div>
      ))}
    </RackGrid>
  )
}
