import type { CSSProperties } from "react"
import type { Piece } from "../../data/catalog"
import type { PublicLook } from "../../state/publicLooks"
import { PieceTile } from "../../components/piece/PieceTile"
import { LookTile } from "../../components/look/LookTile"
import { RackGrid } from "../../components/piece/RackGrid"
import { EmptyState } from "../../components/ui/EmptyState"
import { Button } from "../../components/ui/Button"

export function ExploreRack({
  mode = "pieces",
  loading,
  error,
  pieces,
  filtered,
  looks = [],
  filteredLooks = [],
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
  onReset: () => void
  onLookLikeCountChange?: (lookId: string, count: number) => void
}) {
  if (mode === "looks") {
    if (loading && looks.length === 0) {
      return (
        <EmptyState title="Opening the wardrobe" body="Gathering community published looks." />
      )
    }
    if (error && looks.length === 0) {
      return <EmptyState title="Couldn't load looks" body={error} />
    }
    if (filteredLooks.length === 0) {
      return (
        <EmptyState
          title="No looks found"
          body="Try another search term or reset filters."
          action={
            <Button variant="primary" className="mt-4 font-extrabold" onClick={onReset}>
              Reset filters
            </Button>
          }
        />
      )
    }
    return (
      <RackGrid>
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
      <EmptyState title="Opening the racks" body="Pulling pieces from Explore." />
    )
  }
  if (error && pieces.length === 0) {
    return <EmptyState title="Couldn't load Explore" body={error} />
  }
  if (filtered.length === 0) {
    return (
      <EmptyState
        title="Nothing in this rack"
        body="Try another category, or clear search."
          action={
            <Button variant="primary" className="mt-4 font-extrabold" onClick={onReset}>
              Reset filters
            </Button>
          }
      />
    )
  }
  return (
    <RackGrid>
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
