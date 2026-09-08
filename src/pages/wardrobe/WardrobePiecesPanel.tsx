import { useMemo } from "react"
import { getPiece } from "../../data/catalog"
import { useCloset } from "../../state/closet"
import { useCatalog } from "../../state/catalog"
import { WardrobeEmpty } from "./WardrobeEmpty"
import { WardrobeFilteredRack } from "./WardrobeFilteredRack"

export function WardrobePiecesPanel() {
  const { owned } = useCloset()
  const { pieces } = useCatalog()

  const ownedPieces = useMemo(
    () =>
      owned
        .map((id) => pieces.find((piece) => piece.id === id) ?? getPiece(id))
        .filter((piece) => piece != null),
    [owned, pieces],
  )

  return (
    <div role="tabpanel">
      {ownedPieces.length === 0 ? (
        <WardrobeEmpty
          title="Wardrobe’s still empty"
          body="Add a hat, a coat, or an accessory in Explore to build your wardrobe."
          to="/"
          cta="Explore pieces"
        />
      ) : (
        <WardrobeFilteredRack
          pieces={ownedPieces}
          listLabel="Filter by layer"
          searchLabel="Search clothing"
          searchPlaceholder="Search clothing..."
          emptyFilterCopy="No owned pieces match the selected filter."
          action="wear"
        />
      )}
    </div>
  )
}
