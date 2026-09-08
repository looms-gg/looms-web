import { useMemo, useState, type CSSProperties } from "react"
import { Link, useNavigate } from "react-router-dom"
import { faCloudArrowUp, faMagnifyingGlass, faWandSparkles } from "@fortawesome/free-solid-svg-icons"
import { SLOT_LABEL, type Piece } from "../data/catalog"
import { ClosetRail, type LayerFilter, type Sort } from "../components/ClosetRail"
import { FaIcon } from "../components/FaIcon"
import { IsoThumb } from "../components/IsoThumb"
import { PieceTile } from "../components/PieceTile"
import { RackGrid } from "../components/RackGrid"
import { useSession } from "../state/closet"
import { useAuth } from "../state/auth"
import { useCatalog } from "../state/catalog"
import { UploadPieceModal } from "../components/UploadPieceModal"
import { AuthModal } from "../components/AuthModal"
import { filterClosetPieces } from "./closetBrowse"

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
  const featuredPieces = useMemo(() => {
    const ids = ["ink-fall", "winter-coat", "dark-sweatpants", "knee-high-converse"]
    return ids
      .map((id) => pieces.find((p) => p.id === id))
      .filter((p): p is Piece => p != null)
  }, [pieces])

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
        <section className="plaza-panel hero-closet rounded-[18px]">
          <div className="hero-dots-container" aria-hidden="true">
            <svg
              className="hero-polka-svg"
              viewBox="0 0 600 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g className="hero-dots-grid">
                {/* Row 0 */}
                <circle cx="135" cy="30" r="16" />
                <circle cx="210" cy="30" r="24" />
                <circle cx="285" cy="30" r="18" />
                <circle cx="360" cy="30" r="26" />
                <circle cx="435" cy="30" r="20" />
                <circle cx="510" cy="30" r="28" />
                <circle cx="585" cy="30" r="22" />

                {/* Row 1 (staggered) */}
                <circle cx="98" cy="95" r="14" />
                <circle cx="173" cy="95" r="22" />
                <circle cx="248" cy="95" r="18" />
                <circle cx="323" cy="95" r="28" />
                <circle cx="398" cy="95" r="16" />
                <circle cx="473" cy="95" r="24" />
                <circle cx="548" cy="95" r="20" />

                {/* Row 2 */}
                <circle cx="135" cy="160" r="20" />
                <circle cx="210" cy="160" r="16" />
                <circle cx="285" cy="160" r="26" />
                <circle cx="360" cy="160" r="18" />
                <circle cx="435" cy="160" r="28" />
                <circle cx="510" cy="160" r="22" />
                <circle cx="585" cy="160" r="16" />

                {/* Row 3 (staggered) */}
                <circle cx="98" cy="225" r="18" />
                <circle cx="173" cy="225" r="26" />
                <circle cx="248" cy="225" r="20" />
                <circle cx="323" cy="225" r="16" />
                <circle cx="398" cy="225" r="28" />
                <circle cx="473" cy="225" r="18" />
                <circle cx="548" cy="225" r="24" />

                {/* Row 4 */}
                <circle cx="135" cy="290" r="22" />
                <circle cx="210" cy="290" r="18" />
                <circle cx="285" cy="290" r="24" />
                <circle cx="360" cy="290" r="28" />
                <circle cx="435" cy="290" r="16" />
                <circle cx="510" cy="290" r="26" />
                <circle cx="585" cy="290" r="20" />
              </g>
            </svg>
          </div>

          <div className="hero-copy">
            <h1 className="text-[2.25rem] font-extrabold leading-[1.12] tracking-tight sm:text-[2.75rem] lg:text-[3.15rem]">
              <span className="block">Custom skins.</span>
              <span className="block">No art skills needed!</span>
            </h1>
            <p className="mt-3 max-w-[44ch] text-base leading-[1.6] text-base-content/70">
              Mix and match layered clothing, hair, and accessories into custom Minecraft skins. Free to style, export, and wear.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/studio" className="btn btn-primary rounded-full pl-5 pr-6 font-extrabold">
                <FaIcon icon={faWandSparkles} className="size-3.5" />
                Open Studio
              </Link>
              <button
                type="button"
                onClick={wearFeatured}
                className="btn btn-ghost rounded-full font-bold border border-base-content/15 hover:border-primary"
              >
                Wear this look
              </button>
            </div>
          </div>

          <div className="hero-figure">
            <div className="hero-avatar-frame">
              <IsoThumb
                outfit={featuredPieces}
                bodyId={DEFAULT_BODY_ID}
                model="classic"
                alt="Featured Winter Explorer look"
                className="size-full"
                priority
              />
            </div>
            <p className="mt-2 text-xs font-bold text-base-content/50">
              Winter Explorer · <span className="tabular-nums">4</span> layers
            </p>
          </div>
        </section>
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

        {loading && pieces.length === 0 ? (
          <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-16 text-center">
            <p className="text-lg font-extrabold">Opening the racks</p>
            <p className="mt-1 max-w-sm text-sm text-base-content/65">
              Pulling pieces from the closet.
            </p>
          </div>
        ) : error && pieces.length === 0 ? (
          <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-16 text-center">
            <p className="text-lg font-extrabold">Couldn&apos;t open the closet</p>
            <p className="mt-1 max-w-sm text-sm text-base-content/65">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-16 text-center">
            <p className="text-lg font-extrabold">Nothing in this rack</p>
            <p className="mt-1 max-w-sm text-sm text-base-content/65">
              Try another category, or clear search.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-4 rounded-full font-extrabold"
              onClick={() => {
                setQuery("")
                setLayer("all")
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
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
        )}
      </div>

      <UploadPieceModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
