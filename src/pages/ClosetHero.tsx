import { Link } from "react-router-dom"
import { faWandSparkles } from "@fortawesome/free-solid-svg-icons"
import type { Piece } from "../data/catalog"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { FaIcon } from "../components/FaIcon"
import { IsoThumb } from "../components/IsoThumb"

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

export function ClosetHero({
  featuredPieces,
  onWearFeatured,
}: {
  featuredPieces: Piece[]
  onWearFeatured: () => void
}) {
  return (
    <section className="plaza-panel hero-closet rounded-[18px]">
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

      <div className="hero-copy">
        <h1 className="text-[2.25rem] font-extrabold leading-[1.12] tracking-tight sm:text-[2.75rem] lg:text-[3.15rem]">
          <span className="block">Custom skins.</span>
          <span className="block">No art skills needed!</span>
        </h1>
        <p className="mt-3 max-w-[44ch] text-base leading-[1.6] text-base-content/70">
          Mix and match layered clothing, hair, and accessories into custom Minecraft skins. Free
          to style, export, and wear.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/studio" className="btn btn-primary rounded-full pl-5 pr-6 font-extrabold">
            <FaIcon icon={faWandSparkles} className="size-3.5" />
            Open Studio
          </Link>
          <button
            type="button"
            onClick={onWearFeatured}
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
  )
}
