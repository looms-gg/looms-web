import { useMemo, useState, type CSSProperties } from "react"
import type { Piece } from "../../data/catalog"
import { PieceTile } from "../../components/piece/PieceTile"
import { RackGrid } from "../../components/piece/RackGrid"
import { filterExplorePieces, type SlotFilter } from "../../lib/exploreBrowse"
import { WardrobeEmptyRack, WardrobeFilterBar } from "./WardrobeFilterBar"

export function WardrobeFilteredRack({
  pieces,
  listLabel,
  searchLabel,
  searchPlaceholder,
  emptyFilterCopy,
  action = "wear",
}: {
  pieces: Piece[]
  listLabel: string
  searchLabel: string
  searchPlaceholder: string
  emptyFilterCopy: string
  action?: "catalog" | "wear"
}) {
  const [query, setQuery] = useState("")
  const [slot, setSlot] = useState<SlotFilter>("all")

  const filtered = useMemo(
    () => filterExplorePieces(pieces, query, slot, "Newest"),
    [slot, pieces, query],
  )

  return (
    <div className="space-y-4">
      <WardrobeFilterBar
        slot={slot}
        onSlot={setSlot}
        query={query}
        onQuery={setQuery}
        listLabel={listLabel}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
      />

      {filtered.length === 0 ? (
        <WardrobeEmptyRack
          body={emptyFilterCopy}
          onReset={() => {
            setQuery("")
            setSlot("all")
          }}
        />
      ) : (
        <RackGrid>
          {filtered.map((piece, i) => (
            <div
              key={piece.id}
              className="rack-cell"
              style={{ "--i": Math.min(i, 9) } as CSSProperties}
            >
              <PieceTile piece={piece} action={action} />
            </div>
          ))}
        </RackGrid>
      )}
    </div>
  )
}
