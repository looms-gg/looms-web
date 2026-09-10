import type { HeroPose } from "../../skin/heroPose"
import poseLeft from "../../assets/hero/hero-pose-left.png"
import poseCenter from "../../assets/hero/hero-pose-center.png"
import poseRight from "../../assets/hero/hero-pose-right.png"

/**
 * Loading placeholder for the hero bust renders: the three poses rendered
 * ONCE offline through the exact production pipeline (skin/heroPose camera +
 * pose code, skin/thumbFx shadow+rim bake) and saved as static PNGs. A plain
 * default body, so the placeholder is outfit-agnostic.
 *
 * Rendered with scripts/render-hero-skeletons.html (served by the dev server,
 * captured in a browser, saved via the iso-saver middleware); if the hero
 * camera ever changes, re-render these assets to match.
 */
const SKELETON_PNGS: Record<HeroPose, string> = {
  left: poseLeft,
  center: poseCenter,
  right: poseRight,
}

export function HeroBustSilhouette({
  pose,
  className = "",
}: {
  pose: HeroPose
  className?: string
}) {
  return (
    <div
      className={`skin-bone-silhouette pointer-events-none ${className}`}
      style={{ backgroundImage: `url("${SKELETON_PNGS[pose]}")` }}
      aria-hidden="true"
    />
  )
}
