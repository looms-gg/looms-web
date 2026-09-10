import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { MakerLink } from "../piece/MakerLink"
import { useCatalogOptional } from "../../state/catalog"
import type { PublicLook } from "../../state/publicLooks"
import type { HeroPose } from "../../skin/heroPose"
import { HeroBustSilhouette } from "./HeroBustSilhouette"

// Loaded on demand: skin/heroPose pulls in three.js + skinview3d (~large async
// chunk). The hero shows skeletons until the module is ready. Shadow+rim fx
// are baked into the hero PNG (skin/thumbFx) — no per-figure CSS filters.

export function HeroPosedFigureSkeleton({
  pose = "center",
  className = "",
}: {
  pose?: HeroPose
  className?: string
}) {
  return (
    <div
      className={`relative flex flex-col items-center select-none shrink-0 w-[160px] sm:w-[190px] lg:w-[210px] pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Skeleton Text above the head */}
      <div className="relative z-20 -mb-2 sm:-mb-3 lg:-mb-4 flex flex-col items-center text-center w-full max-w-[150px] px-1">
        <div className="skin-bone h-3.5 sm:h-4 w-20 sm:w-24 rounded-md mb-1.5 opacity-60" />
        <div className="skin-bone h-2.5 sm:h-3 w-14 sm:w-16 rounded-md opacity-40" />
      </div>

      {/* Skeleton Bust silhouette: pose-accurate SVG in the exact box the
          rendered bust will occupy (same aspect + bottom anchoring). */}
      <div className="relative w-full max-w-[210px] sm:max-w-[250px] lg:max-w-[280px] aspect-[9/10] flex items-end justify-center py-2">
        <HeroBustSilhouette pose={pose} />
      </div>
    </div>
  )
}

export function HeroPosedFigure({
  look,
  pose,
  loading: externalLoading,
  className = "",
}: {
  look?: PublicLook
  pose: HeroPose
  rank?: 1 | 2 | 3
  onWear?: (look: PublicLook) => void
  loading?: boolean
  className?: string
}) {
  // Labels sit outside the side figures at head height: left friend's text
  // floats to the LEFT of the figure (right-aligned against it), right
  // friend's to the RIGHT (left-aligned), middle friend's centered above.
  const labelPos =
    pose === "left"
      ? "top-20 sm:top-24 lg:top-28 right-full translate-x-5 sm:translate-x-7 lg:translate-x-9 items-end text-right w-24 sm:w-28 lg:w-32"
      : pose === "right"
        ? "top-20 sm:top-24 lg:top-28 left-full -translate-x-5 sm:-translate-x-7 lg:-translate-x-9 items-start text-left w-24 sm:w-28 lg:w-32"
        : "top-5 sm:top-6 lg:top-7 left-1/2 -translate-x-[38%] items-center text-center w-full max-w-[165px]"
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  // A look stacked with pieces the catalog hasn't hydrated yet composes
  // "naked" (missing layers). Track catalog readiness so those looks retry
  // once the registry loads, instead of pinning a half-dressed hero forever.
  const { loading: catalogLoading } = useCatalogOptional() ?? { loading: false }

  useEffect(() => {
    if (!look) return
    let alive = true
    import("../../skin/heroPose")
      .then(({ heroPosedLookThumb }) => heroPosedLookThumb(look, pose))
      .then((res) => {
        if (alive) {
          // Pending (catalog still loading): keep the placeholder — the effect
          // re-runs when catalogLoading flips false and composes the full skin.
          setImgUrl(res.pending ? null : res.url || null)
        }
      })
      .catch(() => {
        if (alive) {
          setImgUrl(null)
        }
      })
    return () => {
      alive = false
    }
  }, [look, pose, catalogLoading])


  if (externalLoading || !look) {
    return <HeroPosedFigureSkeleton pose={pose} className={className} />
  }

  const fillStyle: CSSProperties = imgUrl
    ? {
        backgroundImage: `url("${imgUrl}")`,
        backgroundSize: "contain",
        backgroundPosition: "center bottom",
      }
    : {}

  // The figure box is wider than the bust art, and the trio overlaps
  // heavily. Let the container's empty gutters pass clicks through to the
  // figures stacked underneath (e.g. the middle friend), and re-enable
  // pointer events only on the actual interactive elements.
  return (
    <div
      className={`group relative flex flex-col items-center select-none shrink-0 pointer-events-none pt-9 sm:pt-10 lg:pt-12 w-[176px] sm:w-[209px] lg:w-[231px] ${className}`}
    >
      {/* Name and Author: beside the side figures (head height), above the
          middle one — absolutely positioned off the figure box */}
      <div className={`absolute z-20 flex flex-col ${labelPos} px-1 transition-transform duration-200 group-hover:-translate-y-1 pointer-events-auto`}>
        {imgUrl ? (
          <>
            <Link
              to={`/look/${look.id}`}
              className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-[13px] sm:text-[15px] font-black tracking-tight text-base-content hover:text-primary transition-colors duration-150 w-full"
              title={look.name}
            >
              {look.name}
            </Link>
            <p className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-[11px] sm:text-[13px] font-bold text-primary/90 w-full">
              <MakerLink username={look.maker} prefix="by @" />
            </p>
          </>
        ) : (
          <>
            <span className="sr-only">{look.name} by {look.maker}</span>
            <div className="flex flex-col items-center w-full py-0.5" aria-hidden="true">
              <div className="skin-bone h-3.5 sm:h-4 w-20 sm:w-24 rounded-md mb-1.5 opacity-60" />
              <div className="skin-bone h-2.5 sm:h-3 w-14 sm:w-16 rounded-md opacity-40" />
            </div>
          </>
        )}
      </div>

      {/* Large Bust Character Pose: Close-up friends portrait with signature looms shadow & rim highlight.
          The link stays full-size so the art renders at full scale, but pointer events are limited to an
          inner hit column matching the bust — the side figures' empty gutters would otherwise swallow
          hover/clicks aimed at the middle character. */}
      <Link
        to={`/look/${look.id}`}
        className="pointer-events-none relative w-full max-w-[231px] sm:max-w-[275px] lg:max-w-[308px] aspect-[9/10] flex items-end justify-center transition-transform duration-300 group-hover:scale-105 active:scale-[0.98]"
        title={`View ${look.name} by ${look.maker}`}
      >
        <div className="relative w-full h-full">
          {/* Pose-accurate placeholder: sits in the exact box the rendered
              bust fills (contain, anchored bottom) so the swap is seamless. */}
          {imgUrl ? null : <HeroBustSilhouette pose={pose} />}
          {imgUrl ? (
            <div className="absolute inset-0 animate-fade-in">
              {/* Figure with baked punch shadow + rim highlight (skin/thumbFx) */}
              <div
                role="img"
                aria-label={`${look.name} by ${look.maker}`}
                className="iso-thumb-fill iso-thumb-figure thumb-in"
                style={fillStyle}
              />
            </div>
          ) : null}
        </div>
        {/* Invisible hit column over the bust: the only pointer-catchable area of this figure */}
        <span
          aria-hidden="true"
          className="pointer-events-auto absolute inset-y-0 left-1/2 -translate-x-1/2 w-[70%] max-w-[176px] sm:max-w-[204px] lg:max-w-[226px]"
        />
      </Link>
    </div>
  )
}
