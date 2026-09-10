import { useEffect, useRef, useState } from "react"
import type { SkinViewer } from "skinview3d"
import { DEFAULT_BODY_ID } from "../../data/bodies"
import { preparePreview, type Piece } from "../../data/catalog"
import { composeSkin, groupsFromAtlas } from "../../skin/compose"
import { applyGroupFocus, crispSkinTexture, isoPoseAnimation, mountLiveViewer, poseGroupForParts, skinviewModel } from "../../skin/focus"
import type { SkinModel } from "../../skin/convert"
import { ISO_RIM_FILL } from "../../skin/thumbFx"

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
  fullFigure = false,
  className = "",
}: {
  outfit: Piece[]
  bodyId?: string
  bodyHue?: number
  model?: SkinModel
  fullFigure?: boolean
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fxRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const viewerRef = useRef<SkinViewer | null>(null)
  const replayRef = useRef<(() => void) | null>(null)
  const paintFxRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)
  // Once the first compose has landed we never go back to the skeleton: the
  // viewer stays mounted and subsequent outfit swaps just re-texture it, so
  // clothing changes read as instant instead of a refresh-from-scratch flash.
  const firstPaint = useRef(true)
  const poseSigRef = useRef<string | null>(null)
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

    const scratch = document.createElement("canvas")

    // Copy the last rendered WebGL frame into the fx overlays. Runs inside the
    // shared rAF callback right after viewer.render(), so the figure and its
    // shadow/rim always show the same frame.
    const paintFx = () => {
      const src = canvasRef.current
      if (src && src.width > 0) {
        if (scratch.width !== src.width || scratch.height !== src.height) {
          scratch.width = src.width
          scratch.height = src.height
        }
        const sCtx = scratch.getContext("2d")
        if (!sCtx) return
        sCtx.clearRect(0, 0, scratch.width, scratch.height)
        sCtx.drawImage(src, 0, 0)

        const [shadow, ...rims] = fxRefs.current
        if (shadow) copySilhouette(scratch, shadow, "#000")
        for (const dest of rims) {
          if (dest) copySilhouette(scratch, dest, ISO_RIM_FILL)
        }
      }
    }

    // OrbitControls fires one change event per input event, which during a
    // drag can be several per display frame. Coalesce render + fx copy into a
    // single rAF so each frame costs one WebGL render + one fx pass — and the
    // overlays land on the same frame as the canvas instead of trailing it.
    let frame: number | null = null
    const frameFx = () => {
      frame = null
      viewer.render()
      paintFx()
    }
    const scheduleFrame = () => {
      if (frame === null) frame = requestAnimationFrame(frameFx)
    }
    const renderNow = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame)
        frame = null
      }
      frameFx()
    }
    paintFxRef.current = renderNow

    viewer.controls.addEventListener("change", scheduleFrame)
    scheduleFrame()

    const ro = new ResizeObserver(() => {
      const w = parent?.clientWidth || 360
      const h = parent?.clientHeight || 420
      viewer.setSize(w, h)
      replayRef.current?.()
      scheduleFrame()
    })
    if (parent) ro.observe(parent)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      viewer.controls.removeEventListener("change", scheduleFrame)
      ro.disconnect()
      viewer.dispose()
      viewerRef.current = null
      paintFxRef.current = () => {}
    }
  }, [])

  // Re-paint fx once the overlay canvases have mounted (first ready flip).
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
    // Hue shifts recolor the body only — pose, camera, and animation stay
    // exactly as they are, so dragging the slider updates the figure live
    // with zero flicker. The full pipeline runs only when the pose signature
    // (outfit, body, model) actually changes.
    const poseSig = `${bodyId}\u0000${model}\u0000${fullFigure ? 1 : 0}\u0000${outfitIds}`
    const poseChanged = poseSigRef.current !== poseSig
    poseSigRef.current = poseSig
    void composeSkin(outfitRef.current, bodyId, bodyHue, model)
      .then((skin) => {
        if (cancelled || viewerRef.current !== viewer) return
        viewer.loadSkin(skin, { model: skinviewModel(model) })
        crispSkinTexture(viewer)
        if (poseChanged) {
          const next = outfitRef.current
          const painted = groupsFromAtlas(skin)
          const { covers, group } = preparePreview(next, painted, { fullFigure })
          const pose = covers ? poseGroupForParts(covers) : group
          viewer.animation = isoPoseAnimation(pose)
          const focus = () => {
            applyGroupFocus(
              viewer,
              group,
              next,
              fullFigure ? ["head", "torso", "legs"] : covers,
              true,
            )
          }
          replayRef.current = focus
          focus()
          // Soft 160ms fade on the re-posed frame so clothing swaps read as a
          // smooth transition. Web Animations API — no remount, so the WebGL
          // context survives. Never on hue drags (must be live) or under
          // reduced motion.
          if (!firstPaint.current) {
            const node = canvasRef.current
            if (
              node &&
              !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
              node.animate(
                [{ opacity: 0.55 }, { opacity: 1 }],
                { duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" },
              )
            }
          }
        }
        // Renders the new frame and repaints the fx overlays from it.
        paintFxRef.current()
        setReady(true)
        firstPaint.current = false
      })
      .catch(() => {
        if (!cancelled && firstPaint.current) setReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [bodyHue, bodyId, fullFigure, model, outfitIds])

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
