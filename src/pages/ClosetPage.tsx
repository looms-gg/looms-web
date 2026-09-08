import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { faCloudArrowUp, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import { SLOT_LABEL } from "../data/catalog"
import { ClosetRail, type LayerFilter, type Sort } from "../components/ClosetRail"
import { FaIcon } from "../components/FaIcon"
import { useSession } from "../state/closet"
import { useAuth } from "../state/auth"
import { useCatalog } from "../state/catalog"
import { UploadPieceModal } from "../components/UploadPieceModal"
import { AuthModal } from "../components/AuthModal"
import { filterClosetPieces } from "./closetBrowse"
import { ClosetHero, pickFeaturedPieces } from "./ClosetHero"
import { ClosetRack } from "./ClosetRack"

import { DEFAULT_BODY_ID } from "../data/bodies"
import { MAX_LIMITS } from "../lib/sanitize"

export function ClosetPage() {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>("Newest")
  const [layer, setLayer] = useState<LayerFilter>("all")
  const [uploadOpen, setUploadOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { user } = useAuth()
  const { pieces, loading, error } = useCatalog()
  const { loadLook } = useSession()
  const navigate = useNavigate()

  const filtered = useMemo(
    () => filterClosetPieces(pieces, query, layer, sort),
    [layer, pieces, query, sort],
  )

  const showHero = !query.trim()
  const featuredPieces = useMemo(() => pickFeaturedPieces(pieces), [pieces])

  function wearFeatured() {
    loadLook({
      id: "featured-look",
      name: "Winter Explorer",
      equipped: {
        hair: "ink-fall",
        coat: "winter-coat",
        pants: "dark-sweatpants",
        shoes: "knee-high-converse",
      },
      stack: ["coat", "pants", "shoes", "hair"],
      bodyId: DEFAULT_BODY_ID,
      bodyHue: 0,
      model: "classic",
      savedAt: Date.now(),
      description: "",
      visibility: "private",
    })
    void navigate("/studio")
  }

  return (
    <div className="space-y-6">
      {showHero ? (
        <ClosetHero featuredPieces={featuredPieces} onWearFeatured={wearFeatured} />
      ) : null}

      <section
        id="closet"
        className="flex flex-col gap-4 rounded-[18px] bg-base-200 p-5 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Browse all pieces</h2>
          <p className="text-sm font-medium text-base-content/60">
            <span className="tabular-nums">{filtered.length}</span> items
            {layer === "all" ? " available" : ` · ${SLOT_LABEL[layer]}`}
          </p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <label className="input input-bordered flex h-11 grow items-center gap-2 rounded-full bg-base-100">
            <FaIcon icon={faMagnifyingGlass} className="size-3.5 opacity-50" />
            <input
              type="search"
              maxLength={MAX_LIMITS.SEARCH_QUERY}
              className="grow border-none bg-transparent shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
              placeholder="Search clothing..."
              aria-label="Search clothing"
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm sm:btn-md rounded-full font-bold gap-2 shrink-0 px-3.5 sm:px-4"
            onClick={() => {
              if (user) {
                setUploadOpen(true)
              } else {
                setAuthOpen(true)
              }
            }}
          >
            <FaIcon icon={faCloudArrowUp} className="size-3.5" />
            <span className="hidden sm:inline">Upload Piece</span>
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ClosetRail sort={sort} layer={layer} onSort={setSort} onLayer={setLayer} />
        <ClosetRack
          loading={loading}
          error={error}
          pieces={pieces}
          filtered={filtered}
          layer={layer}
          sort={sort}
          query={query}
          onReset={() => {
            setQuery("")
            setLayer("all")
          }}
        />
      </div>

      <UploadPieceModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
