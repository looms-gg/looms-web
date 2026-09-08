import { useEffect, useRef, useState } from "react"
import type { SkinViewer } from "skinview3d"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { visibleCovers, type Group, type Piece } from "../data/catalog"
import { composeSkin, focusForGroups, groupsFromAtlas } from "../skin/compose"
import { applyGroupFocus, crispSkinTexture, isoPoseAnimation, mountLiveViewer, skinviewModel } from "../skin/focus"
import type { SkinModel } from "../skin/convert"
import { ISO_RIM_FILL } from "./IsoFigureFx"

const RIM_DIRS = ["ne", "e", "se"] as const

function copySilhouette(from: HTMLCanvasElement, to: HTMLCanvasElement, fill: string) {
  if (to.width !== from.width || to.height !== from.height) {
    to.width = from.width
    to.height = from.height
  }
  const ctx = to.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, to.width, to.height)
  ctx.drawImage(from, 0, 0)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, to.width, to.height)
  ctx.globalCompositeOperation = "source-over"
}

export function SkinStage({
  outfit,
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model = "classic",
  group = "full",
  fullFigure = false,
  className = "",
}: {
  outfit: Piece[]
  bodyId?: string
  bodyHue?: number
  model?: SkinModel
  group?: Group | "full"
  fullFigure?: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fxRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const viewerRef = useRef<SkinViewer | null>(null)
  const replayRef = useRef<(() => void) | null>(null)
  const paintFxRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)
  const outfitRef = useRef(outfit)
  outfitRef.current = outfit
  const outfitIds = outfit.map((piece) => piece.id).join("|")

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    let viewer: SkinViewer
    try {
      viewer = mountLiveViewer(
        canvas,
        parent?.clientWidth || 360,
        parent?.clientHeight || 420,
      )
    } catch {
      return
    }
    viewerRef.current = viewer
    viewer.renderPaused = true

    let fxFrame: number | null = null

    const paintFx = () => {
      fxFrame = null
      const src = canvasRef.current
      if (src && src.width > 0) {
        const [shadow, ...rims] = fxRefs.current
        if (shadow) copySilhouette(src, shadow, "#000")
        for (const dest of rims) {
          if (dest) copySilhouette(src, dest, ISO_RIM_FILL)
        }
      }
    }

    const schedulePaintFx = () => {
      if (fxFrame !== null) return
      fxFrame = requestAnimationFrame(paintFx)
    }
    paintFxRef.current = schedulePaintFx

    const onControlsChange = () => {
      viewer.render()
      schedulePaintFx()
    }
    viewer.controls.addEventListener("change", onControlsChange)

    const ro = new ResizeObserver(() => {
      const w = parent?.clientWidth || 360
      const h = parent?.clientHeight || 420
      viewer.setSize(w, h)
      replayRef.current?.()
      viewer.render()
      schedulePaintFx()
    })
    if (parent) ro.observe(parent)

    return () => {
      if (fxFrame !== null) cancelAnimationFrame(fxFrame)
      viewer.controls.removeEventListener("change", onControlsChange)
      ro.disconnect()
      viewer.dispose()
      viewerRef.current = null
      paintFxRef.current = () => {}
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const frame = requestAnimationFrame(() => {
      paintFxRef.current()
    })
    return () => cancelAnimationFrame(frame)
  }, [ready])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    let cancelled = false
    setReady(false)
    void composeSkin(outfitRef.current, bodyId, bodyHue, model)
      .then((skin) => {
        if (cancelled || viewerRef.current !== viewer) return
        const next = outfitRef.current
        viewer.loadSkin(skin, { model: skinviewModel(model) })
        crispSkinTexture(viewer)
        const studio = fullFigure
        const painted = groupsFromAtlas(skin)
        const covers =
          studio || (group === "full" && next.length !== 1)
            ? undefined
            : next.length === 1
              ? visibleCovers(next[0], painted)
              : painted
        const pose = studio
          ? "full"
          : covers
            ? covers.includes("torso") && covers.includes("legs")
              ? "full"
              : covers.includes("torso")
                ? "torso"
                : covers.includes("legs")
                  ? "legs"
                  : "head"
            : group
        viewer.animation = isoPoseAnimation(pose)
        const focus = () => {
          applyGroupFocus(
            viewer,
            studio ? "full" : covers ? focusForGroups(covers) : group,
            next,
            studio ? ["head", "torso", "legs"] : covers,
            true,
          )
        }
        replayRef.current = focus
        focus()
        viewer.render()
        paintFxRef.current()
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) setReady(false)
      })
    return () => {
      cancelled = true
      replayRef.current = null
    }
  }, [bodyHue, bodyId, fullFigure, group, model, outfitIds])

  return (
    <div className={`skin-stage relative overflow-hidden bg-base-200 ${className}`}>
      {ready ? null : <div className="skin-bone absolute inset-0 z-10" aria-hidden />}
      <div className="skin-stage-inset">
        {ready ? (
          <>
            <canvas
              ref={(node) => {
                fxRefs.current[0] = node
              }}
              className="skin-stage-fx iso-thumb-shadow"
              aria-hidden
            />
            <div className="iso-thumb-rim" aria-hidden>
              {RIM_DIRS.map((dir, i) => (
                <canvas
                  key={dir}
                  ref={(node) => {
                    fxRefs.current[i + 1] = node
                  }}
                  className="skin-stage-fx iso-thumb-rim-copy"
                  data-rim={dir}
                />
              ))}
            </div>
          </>
        ) : null}
        <canvas
          ref={canvasRef}
          className={`skin-stage-canvas h-full w-full touch-none ${ready ? "" : "opacity-0"}`}
        />
      </div>
    </div>
  )
}
