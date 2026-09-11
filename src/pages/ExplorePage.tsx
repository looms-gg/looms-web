import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import {
  CloudArrowUp,
  MagnifyingGlass,
  Sparkle,
} from "@phosphor-icons/react"
import { SLOT_LABEL } from "../data/catalog"
import { ExploreRail } from "../components/explore/ExploreRail"
import { HeadMeta } from "../components/shell/HeadMeta"
import { Icon } from "../components/ui/Icon"
import { useWardrobe } from "../state/wardrobe"
import { useAuth } from "../state/auth"
import { useCatalog } from "../state/catalog"
import { UploadPieceModal } from "../components/piece/UploadPieceModal"
import { AuthModal } from "../components/auth/AuthModal"
import { filterExplorePieces, type SlotFilter, type Sort } from "../lib/exploreBrowse"
import {
  DEFAULT_FEATURED_LOOKS,
  fetchPublicLooksFeed,
  fetchTrendingLooksPastDay,
  fetchYesterdayTopLook,
  filterAndSortPublicLooks,
  publicLookToLook,
  type LookModelFilter,
  type LookSort,
  type PublicLook,
} from "../state/publicLooks"
import { ExploreHero } from "./explore/ExploreHero"
import { ExploreRack } from "./explore/ExploreRack"
import { MAX_LIMITS } from "../lib/sanitize"
import { formatErrorMessage } from "../lib/errorFormat"

const RAIL_STICKY_OFFSET = 88

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const tabParam = searchParams.get("tab")
  // /look is a prerendered landing page; the SPA route aliases it to the
  // Explore page in looks mode so crawlers and users see the same content.
  const isLookLanding = location.pathname === "/look"
  const mode: "pieces" | "looks" =
    tabParam === "looks" || isLookLanding ? "looks" : "pieces"

  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>("Newest")
  const [slot, setSlot] = useState<SlotFilter>("all")
  const [lookSort, setLookSort] = useState<LookSort>("Trending")
  const [lookModel, setLookModel] = useState<LookModelFilter>("all")

  const [looks, setLooks] = useState<PublicLook[]>([])
  const [looksLoading, setLooksLoading] = useState(true)
  const [looksError, setLooksError] = useState<string | null>(null)
  const [trendingLooks, setTrendingLooks] = useState<PublicLook[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [yesterdayTop, setYesterdayTop] = useState<PublicLook | null>(null)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const { user } = useAuth()
  const { pieces, loading: piecesLoading, error: piecesError } = useCatalog()
  const { loadLook } = useWardrobe()
  const navigate = useNavigate()
  const resultsRef = useRef<HTMLDivElement>(null)
  const lastSlot = useRef(slot)

  useLayoutEffect(() => {
    if (lastSlot.current === slot) return
    lastSlot.current = slot
    const grid = resultsRef.current
    if (!grid) return
    const top = grid.getBoundingClientRect().top + window.scrollY - RAIL_STICKY_OFFSET
    if (top > 0 && window.scrollY > top) {
      window.scrollTo({
        top,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      })
    }
  }, [slot])

  useEffect(() => {
    let active = true
    setTrendingLoading(true)
    // Never let a hung request pin the hero on skeletons forever.
    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), ms)
        p.then(
          (v) => { clearTimeout(t); resolve(v) },
          (e) => { clearTimeout(t); reject(e) },
        )
      })
    void withTimeout(fetchTrendingLooksPastDay(3), 10_000)
      .then((res) => {
        if (active) {
          if (res.length >= 3) {
            setTrendingLooks(res)
          } else {
            setTrendingLooks(DEFAULT_FEATURED_LOOKS)
          }
          setTrendingLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setTrendingLooks(DEFAULT_FEATURED_LOOKS)
          setTrendingLoading(false)
        }
      })
    void fetchPublicLooksFeed()
      .then((res) => {
        if (active) {
          setLooks(res)
          setLooksLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setLooksError(formatErrorMessage(err))
          setLooksLoading(false)
        }
      })
    void fetchYesterdayTopLook().then((top) => {
      if (active) setYesterdayTop(top)
    })
    return () => {
      active = false
    }
  }, [])

  function setMode(nextMode: "pieces" | "looks") {
    if (isLookLanding && nextMode === "pieces") {
      navigate("/", { replace: true })
      return
    }
    const next = new URLSearchParams(searchParams)
    if (nextMode === "looks") {
      next.set("tab", "looks")
    } else {
      next.delete("tab")
    }
    setSearchParams(next, { replace: true })
  }

  const filteredPieces = useMemo(
    () => filterExplorePieces(pieces, query, slot, sort),
    [slot, pieces, query, sort],
  )

  const filteredLooks = useMemo(
    () => filterAndSortPublicLooks(looks, query, lookSort, lookModel),
    [looks, query, lookSort, lookModel],
  )

  const showHero = !query.trim()

  // Canonical: the clean URL for the active mode. Faceted variants
  // (/?tab=looks) canonicalize to /look so param URLs never split equity.
  const canonicalPath = mode === "looks" ? "/look" : "/"
  const siteJsonLd = useMemo(
    () =>
      mode === "pieces"
        ? ({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "looms",
            alternateName: "looms.gg",
            url: "https://looms.gg/",
            description:
              "Free modular wardrobe for Minecraft skins: browse community clothing layers, stack outfits in Studio, export a vanilla 64×64 PNG.",
            isAccessibleForFree: true,
          } as const)
        : null,
    [mode],
  )

  function handleWearLook(look: PublicLook) {
    loadLook(publicLookToLook(look))
    void navigate("/studio")
  }

  function handleLookLikeCountChange(lookId: string, nextCount: number) {
    setLooks((prev) =>
      prev.map((l) => (l.id === lookId ? { ...l, likeCount: nextCount } : l)),
    )
  }

  return (
    <div className="space-y-6">
      <HeadMeta
        title={mode === "looks" ? "Minecraft Outfits & Community Looks" : undefined}
        description={
          mode === "looks"
            ? "Browse modular layered Minecraft outfits by the looms community. Preview looks in 3D, wear them in Studio, and export a vanilla 64×64 skin PNG — free."
            : undefined
        }
        url={canonicalPath}
        jsonLd={siteJsonLd} />
      {showHero ? (
        <ExploreHero
          trendingLooks={trendingLooks}
          loading={trendingLoading}
          yesterdayTop={yesterdayTop}
          onWearLook={handleWearLook} />
      ) : null}

      <section
        id="wardrobe"
        className="flex flex-col gap-4 rounded-[22px] bg-base-200 p-5 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {mode === "pieces" ? "Browse all pieces" : "Browse community looks"}
          </h2>
          <p className="text-sm font-medium text-base-content/60">
            {mode === "pieces" ? (
              <>
                <span className="tabular-nums">{filteredPieces.length}</span> items
                {slot === "all" ? " available" : ` · ${SLOT_LABEL[slot]}`}
              </>
            ) : (
              <>
                <span className="tabular-nums">{filteredLooks.length}</span> looks published
                {lookModel === "all" ? "" : ` · ${lookModel === "slim" ? "Slim 3px" : "Classic 4px"}`}
              </>
            )}
          </p>
        </div>

        <div className="flex w-full max-w-md items-center gap-2">
          <label className="input input-bordered flex h-11 grow items-center gap-2 rounded-full bg-base-100">
            <Icon icon={MagnifyingGlass} size="sm" className="opacity-50" />
            <input
              type="search"
              maxLength={MAX_LIMITS.SEARCH_QUERY}
              className="grow border-none bg-transparent shadow-none outline-none focus:border-none focus:shadow-none focus:outline-none focus:ring-0"
              placeholder={mode === "pieces" ? "Search clothing..." : "Search looks or creators..."}
              aria-label={mode === "pieces" ? "Search clothing" : "Search looks"}
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, MAX_LIMITS.SEARCH_QUERY))} />
          </label>

          {mode === "pieces" ? (
            <button
              type="button"
              className="btn btn-primary btn-sm sm:btn-md rounded-full font-bold gap-2 shrink-0 px-3.5 sm:px-4 shadow-sm active:scale-[0.96] transition-transform"
              onClick={() => {
                if (user) {
                  setUploadOpen(true)
                } else {
                  setAuthOpen(true)
                }
              }}
            >
              <Icon icon={CloudArrowUp} size="sm" />
              <span className="hidden sm:inline">Upload Piece</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm sm:btn-md rounded-full font-bold gap-2 shrink-0 px-3.5 sm:px-4 shadow-sm active:scale-[0.96] transition-transform"
              onClick={() => {
                if (user) {
                  void navigate("/studio")
                } else {
                  setAuthOpen(true)
                }
              }}
            >
              <Icon icon={Sparkle} size="sm" />
              <span className="hidden sm:inline">Open Studio</span>
            </button>
          )}
        </div>
      </section>

      <div
        ref={resultsRef}
        className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]"
      >
        <ExploreRail
          mode={mode}
          onModeChange={setMode}
          pieceCount={pieces.length}
          lookCount={looks.length}
          sort={sort}
          slot={slot}
          lookSort={lookSort}
          model={lookModel}
          onSort={setSort}
          onSlot={setSlot}
          onLookSort={setLookSort}
          onModel={setLookModel} />
        <ExploreRack
          mode={mode}
          loading={mode === "pieces" ? piecesLoading : looksLoading}
          error={mode === "pieces" ? piecesError : looksError}
          pieces={pieces}
          filtered={filteredPieces}
          looks={looks}
          filteredLooks={filteredLooks}
          slot={slot}
          sort={sort}
          lookSort={lookSort}
          model={lookModel}
          query={query}
          onReset={() => {
            setQuery("")
            setSlot("all")
            setLookModel("all")
          }}
          onLookLikeCountChange={handleLookLikeCountChange} />
      </div>

      <UploadPieceModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
