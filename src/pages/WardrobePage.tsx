import { useMemo, useState, type CSSProperties } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { faCloudArrowUp, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"
import { SLOTS, SLOT_LABEL, getPiece } from "../data/catalog"
import { piecesFromEquipped } from "../data/outfit"
import { FaIcon } from "../components/FaIcon"
import { IsoThumb } from "../components/IsoThumb"
import { PieceTile } from "../components/PieceTile"
import { RackGrid } from "../components/RackGrid"
import { UploadPieceModal } from "../components/UploadPieceModal"
import { AuthModal } from "../components/AuthModal"
import { useSession } from "../state/closet"
import { useCatalog } from "../state/catalog"
import { useAuthOptional } from "../state/auth"
import { parseWardrobeTab, type WardrobeTab } from "./wardrobeTab"
import { LookInspector } from "./wardrobe/LookInspector"
import { InspectorModal } from "./wardrobe/InspectorModal"
import { filterClosetPieces } from "./closetBrowse"
import type { LayerFilter } from "../components/ClosetRail"
import { MAX_LIMITS } from "../lib/sanitize"

export function WardrobePage() {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { owned, looks, loadLook } = useSession()
  const { pieces } = useCatalog()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const urlTab = parseWardrobeTab(params.toString())
  const [optimisticTab, setOptimisticTab] = useState<WardrobeTab | null>(null)
  if (optimisticTab != null && optimisticTab === urlTab) {
    setOptimisticTab(null)
  }
  const tab = optimisticTab ?? urlTab
  const [query, setQuery] = useState("")
  const [layer, setLayer] = useState<LayerFilter>("all")
  const [lookQuery, setLookQuery] = useState("")
  const [uploadQuery, setUploadQuery] = useState("")
  const [uploadLayer, setUploadLayer] = useState<LayerFilter>("all")

  const [uploadOpen, setUploadOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const ownedPieces = useMemo(
    () =>
      owned
        .map((id) => pieces.find((piece) => piece.id === id) ?? getPiece(id))
        .filter((piece) => piece != null),
    [owned, pieces],
  )
  const filteredOwned = useMemo(
    () => filterClosetPieces(ownedPieces, query, layer, "Newest"),
    [layer, ownedPieces, query],
  )

  const filteredLooks = useMemo(() => {
    const q = lookQuery.trim().toLowerCase()
    if (!q) return looks
    return looks.filter(
      (look) =>
        look.name.toLowerCase().includes(q) ||
        (look.description ?? "").toLowerCase().includes(q),
    )
  }, [lookQuery, looks])

  const [inspectedLookId, setInspectedLookId] = useState<string | null>(null)
  const inspectedLook = looks.find((look) => look.id === inspectedLookId) ?? null

  const myUploads = useMemo(() => {
    if (!user) return []
    return pieces.filter((p) => p.userId === user.id)
  }, [pieces, user])

  const filteredUploads = useMemo(
    () => filterClosetPieces(myUploads, uploadQuery, uploadLayer, "Newest"),
    [myUploads, uploadLayer, uploadQuery],
  )

  function selectTab(next: WardrobeTab) {
    setOptimisticTab(next)
    setParams({ tab: next })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] bg-base-200 p-5 md:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Wardrobe</h1>
        <p className="mt-1 max-w-xl text-base-content/70">
          Saved characters and pieces you own.
        </p>
        <div
          role="tablist"
          aria-label="Wardrobe sections"
          className="mt-4 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "looks"}
              className={`btn btn-sm rounded-full font-extrabold ${tab === "looks" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => selectTab("looks")}
            >
              Looks
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "pieces"}
              className={`btn btn-sm rounded-full font-extrabold ${tab === "pieces" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => selectTab("pieces")}
            >
              Pieces
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "uploads"}
              className={`btn btn-sm rounded-full font-extrabold ${tab === "uploads" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => selectTab("uploads")}
            >
              My Uploads
              {myUploads.length > 0 && (
                <span className="badge badge-xs badge-neutral ml-1 tabular-nums">
                  {myUploads.length}
                </span>
              )}
            </button>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="btn btn-outline btn-sm rounded-full font-bold"
            >
              <FaIcon icon={faCloudArrowUp} className="size-3.5 mr-1.5" />
              Upload piece
            </button>
          )}
        </div>
      </section>

      {tab === "looks" && (
        <div role="tabpanel">
          {looks.length === 0 ? (
            <Empty
              title="No looks yet"
              body="Wear a few layers in Studio and save the combo. It lands here."
              to="/studio"
              cta="Open studio"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-base-content/60">
                  <span className="tabular-nums">{looks.length}</span>{" "}
                  {looks.length === 1 ? "look" : "looks"}
                </p>
                <div className="w-full sm:max-w-xs">
                  <label className="input input-bordered flex h-10 items-center gap-2 rounded-full bg-base-100">
                    <FaIcon icon={faMagnifyingGlass} className="size-3.5 opacity-50" />
                    <input
                      type="search"
                      maxLength={MAX_LIMITS.SEARCH_QUERY}
                      className="grow border-none bg-transparent text-sm shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
                      placeholder="Search looks..."
                      aria-label="Search looks"
                      value={lookQuery}
                      onChange={(event) =>
                        setLookQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))
                      }
                    />
                  </label>
                </div>
              </div>

              {filteredLooks.length === 0 ? (
                <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-12 text-center">
                  <p className="text-base font-extrabold">No looks match</p>
                  <p className="mt-1 text-sm text-base-content/65">
                    No saved looks match your search.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm mt-4 rounded-full font-extrabold"
                    onClick={() => setLookQuery("")}
                  >
                    Reset search
                  </button>
                </div>
              ) : (
                <RackGrid>
                  {filteredLooks.map((look, i) => {
                    const isOpen = look.id === inspectedLookId
                    return (
                      <button
                        key={look.id}
                        type="button"
                        aria-pressed={isOpen}
                        className={`look-tile rack-cell piece-tile tile-lift bg-base-200 text-left ${
                          isOpen ? "look-tile-on" : ""
                        }`}
                        style={{ "--i": Math.min(i, 9) } as CSSProperties}
                        onClick={() => setInspectedLookId(look.id)}
                      >
                        <IsoThumb
                          outfit={piecesFromEquipped(look.equipped, look.stack)}
                          bodyId={look.bodyId}
                          bodyHue={look.bodyHue}
                          model={look.model ?? "classic"}
                          alt={look.name}
                        />
                        <div className="bg-neutral px-4 py-3 min-w-0">
                          <h3
                            className="truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold"
                            title={look.name}
                          >
                            {look.name}
                          </h3>
                          <p className="text-sm font-semibold text-primary">
                            <span className="tabular-nums">
                              {SLOTS.filter((slot) => look.equipped[slot]).length}
                            </span>{" "}
                            layers
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </RackGrid>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "pieces" && (
        <div role="tabpanel">
          {ownedPieces.length === 0 ? (
            <Empty
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
      )}

      {tab === "uploads" && (
        <div role="tabpanel">
          {!user ? (
            <Empty
              title="Sign in to view your creations"
              body="Log in or create an account to upload, manage, and edit your custom garments."
              cta="Sign in"
              onClick={() => setAuthOpen(true)}
            />
          ) : myUploads.length === 0 ? (
            <Empty
              title="No uploads yet"
              body="Upload custom 64×64 PNG Minecraft clothing pieces to use in Studio and share with the community."
              cta="Upload piece"
              onClick={() => setUploadOpen(true)}
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
      )}

      <InspectorModal
        open={Boolean(inspectedLook)}
        title={inspectedLook?.name ?? "Look"}
        onClose={() => setInspectedLookId(null)}
      >
        {inspectedLook ? (
          <LookInspector
            look={inspectedLook}
            onEditOutfit={() => {
              loadLook(inspectedLook)
              void navigate("/studio")
            }}
          />
        ) : null}
      </InspectorModal>

      <UploadPieceModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}

function Empty({
  title,
  body,
  to,
  cta,
  onClick,
}: {
  title: string
  body: string
  to?: string
  cta: string
  onClick?: () => void
}) {
  return (
    <div className="grid place-items-center rounded-[18px] border border-dashed border-base-content/15 bg-base-200 px-6 py-14 text-center">
      <p className="text-lg font-extrabold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-base-content/65">{body}</p>
      {to ? (
        <Link to={to} className="btn btn-primary mt-4 rounded-full font-extrabold">
          {cta}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="btn btn-primary mt-4 rounded-full font-extrabold"
        >
          {cta}
        </button>
      )}
    </div>
  )
}
