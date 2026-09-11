import { useState } from "react"
import { Link } from "react-router-dom"
import { Sparkle } from "@phosphor-icons/react"
import type { Piece } from "../../data/catalog"
import { Icon } from "../../components/ui/Icon"
import { DEFAULT_FEATURED_LOOKS, type PublicLook } from "../../state/publicLooks"
import { HeroPosedFigure } from "../../components/hero/HeroPosedFigure"

const FEATURED_PIECE_IDS = [
  "ink-fall",
  "winter-coat",
  "dark-sweatpants",
  "knee-high-converse",
] as const

export function pickFeaturedPieces(pieces: Piece[]): Piece[] {
  return FEATURED_PIECE_IDS.map((id) => pieces.find((p) => p.id === id)).filter(
    (p): p is Piece => p != null,
  )
}

export function ExploreHero({
  trendingLooks = DEFAULT_FEATURED_LOOKS,
  loading = false,
  yesterdayTop = null,
  onWearLook: _onWearLook,
  featuredPieces: _featuredPieces,
  onWearFeatured: _onWearFeatured,
}: {
  trendingLooks?: PublicLook[]
  loading?: boolean
  yesterdayTop?: PublicLook | null
  onWearLook?: (look: PublicLook) => void
  featuredPieces?: Piece[]
  onWearFeatured?: () => void
}) {
  const [mobileTab, setMobileTab] = useState<0 | 1 | 2>(0)
  const looks = trendingLooks.length >= 3 ? trendingLooks : DEFAULT_FEATURED_LOOKS
  // Yesterday's #1 takes the center slot, bumping the lowest-ranked trending
  // look out of the pose. A look already trending keeps the hero unchanged.
  const crownWorthy = Boolean(
    !loading && yesterdayTop && !looks.some((l) => l.id === yesterdayTop.id),
  )
  const heroLooks = crownWorthy && yesterdayTop
    ? [yesterdayTop, looks[0], looks[1]]
    : looks

  return (
    <section className="plaza-panel hero-wardrobe rounded-[22px] overflow-hidden">
      <div className="hero-dots-container" aria-hidden="true">
        <svg
          className="hero-polka-svg"
          viewBox="0 0 600 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g className="hero-dots-grid">
            <circle cx="135" cy="30" r="16" />
            <circle cx="210" cy="30" r="24" />
            <circle cx="285" cy="30" r="18" />
            <circle cx="360" cy="30" r="26" />
            <circle cx="435" cy="30" r="20" />
            <circle cx="510" cy="30" r="28" />
            <circle cx="585" cy="30" r="22" />

            <circle cx="98" cy="95" r="14" />
            <circle cx="173" cy="95" r="22" />
            <circle cx="248" cy="95" r="18" />
            <circle cx="323" cy="95" r="28" />
            <circle cx="398" cy="95" r="16" />
            <circle cx="473" cy="95" r="24" />
            <circle cx="548" cy="95" r="20" />

            <circle cx="135" cy="160" r="20" />
            <circle cx="210" cy="160" r="16" />
            <circle cx="285" cy="160" r="26" />
            <circle cx="360" cy="160" r="18" />
            <circle cx="435" cy="160" r="28" />
            <circle cx="510" cy="160" r="22" />
            <circle cx="585" cy="160" r="16" />

            <circle cx="98" cy="225" r="18" />
            <circle cx="173" cy="225" r="26" />
            <circle cx="248" cy="225" r="20" />
            <circle cx="323" cy="225" r="16" />
            <circle cx="398" cy="225" r="28" />
            <circle cx="473" cy="225" r="18" />
            <circle cx="548" cy="225" r="24" />

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

      <div className="hero-copy max-w-xl">
        <h1 className="text-[2.25rem] font-black leading-[1.1] tracking-tight sm:text-[2.75rem] lg:text-[3.15rem] text-balance">
          <span className="block">Custom skins.</span>
          <span className="block text-primary">No art skills needed!</span>
        </h1>
        <p className="mt-3 max-w-[44ch] text-base leading-[1.6] text-base-content/70 font-medium text-pretty">
          Mix and match layered clothing, hair, and accessories into custom Minecraft skins. Free
          to style, export, and wear.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/studio"
            className="btn btn-primary rounded-full pl-5 pr-6 font-extrabold shadow-md active:scale-[0.96] transition-transform"
          >
            <Icon icon={Sparkle} size="sm" />
            Open Studio
          </Link>
          <a
            href="https://discord.gg/UNTRgHBBPb"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost rounded-full font-bold border border-base-content/20 hover:border-[#5865F2] hover:text-[#5865F2] active:scale-[0.96] transition-transform gap-2 pl-4 pr-5"
            title="Join the looms Discord community"
          >
            <svg className="size-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Join Discord
          </a>
        </div>
      </div>

      {/* 3 Friends Posing Together (Intimate Bust Portrait) */}
      <div className="relative z-10 flex flex-col items-center">
        {crownWorthy && yesterdayTop ? (
          <Link
            to={`/look/${yesterdayTop.id}`}
            className="btn btn-xs sm:btn-sm rounded-full font-bold border border-base-content/15 bg-base-100/80 hover:border-primary gap-2 pl-3 pr-4 mb-2"
            title="The look the community liked most yesterday"
          >
            <span className="font-extrabold text-primary">Yesterday's #1</span>
            <span className="max-w-[140px] truncate opacity-70">{yesterdayTop.name}</span>
          </Link>
        ) : null}

        {/* Mobile Look Switcher tabs */}
        <div className="flex md:hidden items-center gap-2 mb-2">
          {loading
            ? [0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="skin-bone h-6 w-16 rounded-full opacity-50"
                  aria-hidden="true" />
              ))
            : [0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn btn-xs rounded-full font-extrabold max-w-[120px] truncate ${
                    mobileTab === idx ? "btn-primary text-primary-content" : "btn-ghost border border-base-content/15"
                  }`}
                  onClick={() => setMobileTab(idx as 0 | 1 | 2)}
                >
                  {heroLooks[idx]?.name || `Look ${idx + 1}`}
                </button>
              ))}
        </div>

        {/* Mobile View: single bust figure */}
        <div className="w-full max-w-xs md:hidden flex justify-center py-2">
          <HeroPosedFigure
            look={heroLooks[mobileTab]}
            pose={mobileTab === 0 ? "center" : mobileTab === 1 ? "left" : "right"}
            loading={loading} />
        </div>

        {/* Desktop / Tablet View: 3 friends posing close together (almost a bust) */}
        <div className="hidden md:flex items-end justify-center w-full max-w-2xl py-2">
          {/* Friend 2 (Left, leaning in close, forward over top the middle one) */}
          <HeroPosedFigure
            look={heroLooks[1]}
            pose="left"
            loading={loading}
            className="z-20 hover:z-30" />

          {/* Friend 1 (Center, prominent, moved left to wrap arm behind left friend) */}
          <HeroPosedFigure
            look={heroLooks[0]}
            pose="center"
            loading={loading}
            className="z-10 scale-105 hover:z-30 -ml-20 sm:-ml-26 lg:-ml-32" />

          {/* Friend 3 (Right, leaning in close) */}
          <HeroPosedFigure
            look={heroLooks[2]}
            pose="right"
            loading={loading}
            className="z-10 hover:z-30 -ml-16 sm:-ml-20 lg:-ml-24" />
        </div>
      </div>
    </section>
  )
}
