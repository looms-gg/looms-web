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

export function WardrobeUploadsPanel({
  user,
  myUploads,
  onSignIn,
  onUpload,
}: {
  user: { id: string } | null
  myUploads: Piece[]
  onSignIn: () => void
  onUpload: () => void
}) {
  const [uploadQuery, setUploadQuery] = useState("")
  const [uploadLayer, setUploadLayer] = useState<LayerFilter>("all")

  const filteredUploads = useMemo(
    () => filterClosetPieces(myUploads, uploadQuery, uploadLayer, "Newest"),
    [myUploads, uploadLayer, uploadQuery],
  )

  return (
    <div role="tabpanel">
      {!user ? (
        <WardrobeEmpty
          title="Sign in to view your creations"
          body="Log in or create an account to upload, manage, and edit your custom garments."
          cta="Sign in"
          onClick={onSignIn}
        />
      ) : myUploads.length === 0 ? (
        <WardrobeEmpty
          title="No uploads yet"
          body="Upload custom 64×64 PNG Minecraft clothing pieces to use in Studio and share with the community."
          cta="Upload piece"
          onClick={onUpload}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="listbox"
              aria-label="Filter uploads by layer"
            >
              <button
                type="button"
                className={`btn btn-sm rounded-full font-extrabold ${uploadLayer === "all" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setUploadLayer("all")}
              >
                All
              </button>
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`btn btn-sm rounded-full font-extrabold ${uploadLayer === slot ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setUploadLayer(slot)}
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
                  placeholder="Search uploads..."
                  aria-label="Search uploads"
                  value={uploadQuery}
                  onChange={(event) =>
                    setUploadQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))
                  }
                />
              </label>
            </div>
          </div>

          {filteredUploads.length === 0 ? (
            <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-12 text-center">
              <p className="text-base font-extrabold">Nothing in this rack</p>
              <p className="mt-1 text-sm text-base-content/65">
                No uploads match the selected filter.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mt-4 rounded-full font-extrabold"
                onClick={() => {
                  setUploadQuery("")
                  setUploadLayer("all")
                }}
              >
                Reset filters
              </button>
            </div>
          ) : (
            <RackGrid>
              {filteredUploads.map((piece, i) => (
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
