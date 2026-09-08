import type { CSSProperties, ReactNode } from "react"
import type { Piece } from "../data/catalog"
import type { LayerFilter, Sort } from "../components/ClosetRail"
import { PieceTile } from "../components/PieceTile"
import { RackGrid } from "../components/RackGrid"

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

export function ClosetRack({
  loading,
  error,
  pieces,
  filtered,
  layer,
  sort,
  query,
  onReset,
}: {
  loading: boolean
  error: string | null
  pieces: Piece[]
  filtered: Piece[]
  layer: LayerFilter
  sort: Sort
  query: string
  onReset: () => void
}) {
  if (loading && pieces.length === 0) {
    return (
      <EmptyPanel title="Opening the racks" body="Pulling pieces from the closet." />
    )
  }
  if (error && pieces.length === 0) {
    return <EmptyPanel title="Couldn't open the closet" body={error} />
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
    <RackGrid key={`${layer}:${sort}:${query}`}>
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
