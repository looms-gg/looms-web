import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExploreRail } from "../components/explore/ExploreRail"
import { HeadMeta } from "../components/shell/HeadMeta"
import { useAuth } from "../state/auth"
import { useCatalog } from "../state/catalog"
import { UploadPieceModal } from "../components/piece/UploadPieceModal"
import { AuthModal } from "../components/auth/AuthModal"
import { ExploreHero } from "./explore/ExploreHero"
import { ExploreRack } from "./explore/ExploreRack"
import { usePublicLooksFeed } from "./explore/usePublicLooksFeed"
import { ExploreHeaderBar } from "./explore/ExploreHeaderBar"
import { useSlotScrollEffect } from "./explore/useSlotScrollEffect"
import { useExploreFilters } from "./explore/useExploreFilters"
import { websiteJsonLd } from "../lib/seo"

function getExploreMeta(mode: "pieces" | "looks") {
  if (mode === "looks") {
    return {
      title: "Minecraft Outfits & Community Looks",
      description:
        "Browse modular layered Minecraft outfits by the looms community. Preview looks in 3D, wear them in Studio, and export a vanilla 64×64 skin PNG — free.",
      canonicalPath: "/look",
    }
  }
  return {
    title: undefined,
    description: undefined,
    canonicalPath: "/",
  }
}

export function ExplorePage() {
  const { user } = useAuth()
  const { pieces, loading: piecesLoading, error: piecesError } = useCatalog()
  const {
    looks,
    looksLoading,
    looksError,
    trendingLooks,
    trendingLoading,
    yesterdayTop,
    bumpLookLikeCount,
  } = usePublicLooksFeed()

  const {
    mode,
    setMode,
    query,
    setQuery,
    sort,
    setSort,
    slot,
    setSlot,
    lookSort,
    setLookSort,
    lookModel,
    setLookModel,
    filteredPieces,
    filteredLooks,
    resetFilters,
    showHero,
  } = useExploreFilters(pieces, looks)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const navigate = useNavigate()
  const resultsRef = useRef<HTMLDivElement>(null)

  useSlotScrollEffect(slot, resultsRef)

  const meta = getExploreMeta(mode)
  const siteJsonLd = useMemo(
    () => (mode === "pieces" ? websiteJsonLd() : null),
    [mode],
  )

  function handleActionClick() {
    if (mode === "pieces") {
      if (user) {
        setUploadOpen(true)
      } else {
        setAuthOpen(true)
      }
    } else {
      if (user) {
        void navigate("/studio")
      } else {
        setAuthOpen(true)
      }
    }
  }

  return (
    <div className="space-y-6">
      <HeadMeta
        title={meta.title}
        description={meta.description}
        url={meta.canonicalPath}
        jsonLd={siteJsonLd}
      />
      {showHero ? (
        <ExploreHero
          trendingLooks={trendingLooks}
          loading={trendingLoading}
          yesterdayTop={yesterdayTop}
        />
      ) : null}

      <ExploreHeaderBar
        mode={mode}
        pieceCount={filteredPieces.length}
        lookCount={filteredLooks.length}
        slot={slot}
        lookModel={lookModel}
        query={query}
        onQueryChange={setQuery}
        onActionClick={handleActionClick}
      />

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
          onModel={setLookModel}
        />
        <ExploreRack
          mode={mode}
          loading={mode === "pieces" ? piecesLoading : looksLoading}
          error={mode === "pieces" ? piecesError : looksError}
          pieces={pieces}
          filtered={filteredPieces}
          looks={looks}
          filteredLooks={filteredLooks}
          onReset={resetFilters}
          onLookLikeCountChange={bumpLookLikeCount}
        />
      </div>

      <UploadPieceModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
