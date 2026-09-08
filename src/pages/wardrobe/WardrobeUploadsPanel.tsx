import type { Piece } from "../../data/catalog"
import { WardrobeEmpty } from "./WardrobeEmpty"
import { WardrobeFilteredRack } from "./WardrobeFilteredRack"

export function WardrobeUploadsPanel({
  user: _user,
  myUploads,
  onUpload,
}: {
  user: { id: string }
  myUploads: Piece[]
  onUpload: () => void
}) {
  return (
    <div role="tabpanel">
      {myUploads.length === 0 ? (
        <WardrobeEmpty
          title="No uploads yet"
          body="Upload custom 64×64 PNG Minecraft clothing pieces to use in Studio and share with the community."
          cta="Upload piece"
          onClick={onUpload}
        />
      ) : (
        <WardrobeFilteredRack
          pieces={myUploads}
          listLabel="Filter uploads by layer"
          searchLabel="Search uploads"
          searchPlaceholder="Search uploads..."
          emptyFilterCopy="No uploads match the selected filter."
          action="wear"
        />
      )}
    </div>
  )
}
