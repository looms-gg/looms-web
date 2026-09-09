import { useEffect, useState, type CSSProperties } from "react"
import { Link } from "react-router-dom"
import { MakerLink } from "../piece/MakerLink"
import type { PublicLook } from "../../state/publicLooks"
import type { HeroPose } from "../../skin/heroPose"

// Loaded on demand: skin/heroPose pulls in three.js + skinview3d (~large async
// chunk). The hero shows skeletons until the module is ready. Shadow+rim fx
// are baked into the hero PNG (skin/thumbFx) — no per-figure CSS filters.

export function HeroPosedFigureSkeleton({ className = "" }: { className?: string }) {
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

      {/* Skeleton Bust silhouette */}
      <div className="relative w-full max-w-[210px] sm:max-w-[250px] lg:max-w-[280px] aspect-[9/10] flex items-end justify-center py-2">
        <div className="skin-bone w-28 sm:w-32 lg:w-36 h-36 sm:h-40 lg:h-44 rounded-2xl opacity-40" />
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
  const [imgUrl, setImgUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!look) return
    let alive = true
    import("../../skin/heroPose")
      .then(({ heroPosedLookThumb }) => heroPosedLookThumb(look, pose))
      .then((res) => {
        if (alive) {
          setImgUrl(res.url)
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
  }, [look, pose])


  if (externalLoading || !look) {
    return <HeroPosedFigureSkeleton className={className} />
  }

  const fillStyle: CSSProperties = imgUrl
    ? {
        backgroundImage: `url("${imgUrl}")`,
        backgroundSize: "contain",
        backgroundPosition: "center bottom",
      }
    : {}

  return (
    <div
      className={`group relative flex flex-col items-center select-none shrink-0 w-[160px] sm:w-[190px] lg:w-[210px] ${className}`}
    >
      {/* Name and Author above the head — pulled close to the head with negative margin */}
      <div className="relative z-20 -mb-2 sm:-mb-3 lg:-mb-4 flex flex-col items-center text-center w-full max-w-[150px] px-1 transition-transform duration-200 group-hover:-translate-y-1">
        {imgUrl ? (
          <>
            <Link
              to={`/look/${look.id}`}
              className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm font-black tracking-tight text-base-content hover:text-primary transition-colors duration-150 w-full"
              title={look.name}
            >
              {look.name}
            </Link>
            <p className="truncate whitespace-nowrap overflow-hidden text-ellipsis text-[10px] sm:text-xs font-bold text-primary/90 w-full">
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

      {/* Large Bust Character Pose: Close-up friends portrait with signature looms shadow & rim highlight */}
      <Link
        to={`/look/${look.id}`}
        className="relative w-full max-w-[210px] sm:max-w-[250px] lg:max-w-[280px] aspect-[9/10] flex items-end justify-center transition-transform duration-300 group-hover:scale-105 active:scale-[0.98]"
        title={`View ${look.name} by ${look.maker}`}
      >
        {imgUrl ? (
          <div className="relative w-full h-full animate-fade-in">
            {/* Figure with baked punch shadow + rim highlight (skin/thumbFx) */}
            <div
              role="img"
              aria-label={`${look.name} by ${look.maker}`}
              className="iso-thumb-fill iso-thumb-figure thumb-in"
              style={fillStyle}
            />
          </div>
        ) : (
          <div className="skin-bone w-28 sm:w-32 lg:w-36 h-36 sm:h-40 lg:h-44 rounded-2xl opacity-40 mb-2" aria-hidden="true" />
        )}
      </Link>
    </div>
  )
}
