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

type LabelAlign = "auto" | "center"

// Card geometry shared by the live figure and its skeleton, so the placeholder
// sits in the exact box the render will occupy (same width, top offset, and
// bust framing) instead of only approximating it.
const FIGURE_BOX = "pt-3 sm:pt-4 lg:pt-5 w-[245px] sm:w-[290px] lg:w-[330px]"
const BUST_BOX =
  "w-full max-w-[315px] sm:max-w-[375px] lg:max-w-[425px] aspect-[9/10] flex items-end justify-center"

// Labels sit directly above each figure at head height: the left friend's text
// is centered above the left head/shoulder, the right friend's above the right,
// and the middle friend's centered above the center. A lone figure (mobile tabs)
// always centers its label so it cannot hang past the panel and clip.
function labelPositionClass(pose: HeroPose, labelAlign?: LabelAlign) {
  const center =
    "top-4 sm:top-5 lg:top-6 left-[58%] -translate-x-1/2 items-center text-center w-full max-w-[170px]"
  if (labelAlign === "center") {
    return "top-4 sm:top-5 left-1/2 -translate-x-1/2 items-center text-center w-full max-w-[180px]"
  }
  if (pose === "left") {
    return "top-4 sm:top-5 lg:top-6 left-10 sm:left-11 lg:left-12 items-center text-center w-32 sm:w-36 lg:w-40"
  }
  if (pose === "right") {
    return "top-4 sm:top-5 lg:top-6 right-10 sm:right-11 lg:right-12 items-center text-center w-32 sm:w-36 lg:w-40"
  }
  return center
}

// Two stacked bars standing in for the name and maker lines. Each bar is its
// own positioned box so the shared .skin-bone (absolute, inset:0) fills it
// rather than stacking both bars on the same corner.
function LabelSkeletonBones() {
  return (
    <div className="flex flex-col items-center w-full py-0.5" aria-hidden="true">
      <div className="relative mb-1 h-3 w-16 overflow-hidden rounded-md opacity-60 sm:h-3.5 sm:w-20">
        <div className="skin-bone rounded-md" />
      </div>
      <div className="relative h-2 w-12 overflow-hidden rounded-md opacity-40 sm:h-2.5 sm:w-14">
        <div className="skin-bone rounded-md" />
      </div>
    </div>
  )
}

export function HeroPosedFigureSkeleton({
  pose = "center",
  labelAlign,
  className = "",
}: {
  pose?: HeroPose
  labelAlign?: LabelAlign
  className?: string
}) {
  return (
    <div
      className={`relative flex flex-col items-center select-none shrink-0 pointer-events-none ${FIGURE_BOX} ${className}`}
      aria-hidden="true"
    >
      <div className={`absolute z-20 flex flex-col ${labelPositionClass(pose, labelAlign)} px-1`}>
        <LabelSkeletonBones />
      </div>

      {/* Pose-accurate placeholder in the exact box the rendered bust fills
          (contain, anchored bottom) so the swap is a crossfade, not a shift. */}
      <div className={`relative ${BUST_BOX}`}>
        <div className="relative w-full h-full">
          <HeroBustSilhouette pose={pose} />
        </div>
      </div>
    </div>
  )
}

export function HeroPosedFigure({
  look,
  pose,
  labelAlign,
  loading: externalLoading,
  className = "",
}: {
  look?: PublicLook
  pose: HeroPose
  labelAlign?: "auto" | "center"
  loading?: boolean
  className?: string
}) {
  // Labels sit outside the side figures at head height: left friend's text
  // floats to the LEFT of the figure (right-aligned against it), right
  // friend's to the RIGHT (left-aligned), middle friend's centered above.
  // A lone figure (mobile tabs) always centers its label so it cannot hang
  // past the panel and clip.
  const labelPos = labelPositionClass(pose, labelAlign)
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
          // Empty url (catalog still hydrating): keep the placeholder — the
          // effect re-runs when catalogLoading flips false and composes the
          // full skin.
          setImgUrl(res.url || null)
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
    return <HeroPosedFigureSkeleton pose={pose} labelAlign={labelAlign} className={className} />
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
      className={`group relative flex flex-col items-center select-none shrink-0 pointer-events-none ${FIGURE_BOX} ${className}`}
    >
      {/* Name and Author: beside the side figures (head height), above the
          middle one — absolutely positioned off the figure box */}
      <div className={`absolute z-20 flex flex-col ${labelPos} px-1 transition-transform duration-200 group-hover:-translate-y-1 pointer-events-auto`}>
        {imgUrl ? (
          <>
            <Link
              to={`/look/${look.id}`}
              className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-[13.5px] font-extrabold tracking-tight text-base-content hover:text-primary transition-colors duration-150 w-full"
              title={look.name}
            >
              {look.name}
            </Link>
            <p className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-[10px] sm:text-xs font-bold text-base-content/60 w-full">
              <MakerLink username={look.maker} prefix="by @" />
            </p>
          </>
        ) : (
          <>
            <span className="sr-only">{look.name} by {look.maker}</span>
            <LabelSkeletonBones />
          </>
        )}
      </div>

      {/* Large Bust Character Pose: Close-up friends portrait with signature looms shadow & rim highlight.
          The link stays full-size so the art renders at full scale, but pointer events are limited to an
          inner hit column matching the bust — the side figures' empty gutters would otherwise swallow
          hover/clicks aimed at the middle character. */}
      <Link
        to={`/look/${look.id}`}
        className={`pointer-events-none relative ${BUST_BOX} transition-transform duration-300 group-hover:scale-105 active:scale-[0.98]`}
        title={`View ${look.name} by ${look.maker}`}
      >
        <div className="relative w-full h-full">
          {/* Pose-accurate placeholder: sits in the exact box the rendered
              bust fills (contain, anchored bottom) so the swap is seamless. */}
          {imgUrl ? null : <HeroBustSilhouette pose={pose} />}
          {imgUrl ? (
            <div className="absolute inset-0">
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
          className="pointer-events-auto absolute inset-y-0 left-1/2 -translate-x-1/2 w-[70%] max-w-[205px] sm:max-w-[240px] lg:max-w-[267px]"
        />
      </Link>
    </div>
  )
}
