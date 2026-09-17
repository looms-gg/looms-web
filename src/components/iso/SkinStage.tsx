import { useEffect, useRef, useState } from "react"
import type { SkinViewer } from "skinview3d"
import { DEFAULT_BODY_ID } from "../../data/bodies"
import { preparePreview, type Piece } from "../../data/catalog"
import { composePieceSkin, composeSkin, groupsFromAtlas, partsFromAtlas } from "../../skin/compose"
import { applyGroupFocus, crispSkinTexture, isoPoseAnimation, mountLiveViewer, poseGroupForParts, viewerModelName } from "../../skin/viewer"
import type { SkinModel } from "../../skin/convert"
import { RIM_CSS_PX, RIM_OPACITY, PIECE_RIM_CSS_PX, PIECE_RIM_OPACITY, paintStageFx } from "../../skin/stageFx"

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
  const piecePreview = !fullFigure && outfit.length === 1
  // paintFx lives in the mount effect, so it reads the mode through a ref.
  const piecePreviewRef = useRef(piecePreview)

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
        // FX overlays read the frame back in the same task as viewer.render(),
        // so the retained drawing buffer (GPU copy per composite) is pure cost.
        { preserveDrawingBuffer: false },
      )
    } catch {
      return
    }
    viewerRef.current = viewer
    viewer.renderPaused = true

    // Copy the last rendered WebGL frame into the fx overlays. Runs inside the
    // shared rAF callback right after viewer.render(), so the figure and its
    // shadow/rim always show the same frame.
    const paintFx = () => {
      const src = canvasRef.current
      if (src) {
        const cssPx = piecePreviewRef.current ? PIECE_RIM_CSS_PX : RIM_CSS_PX
        paintStageFx(src, fxRefs.current, cssPx)
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
    piecePreviewRef.current = piecePreview
    // Hue shifts recolor the body only — pose, camera, and animation stay
    // exactly as they are, so dragging the slider updates the figure live
    // with zero flicker. The full pipeline runs only when the pose signature
    // (outfit, body, model) actually changes.
    const poseSig = `${bodyId}\u0000${model}\u0000${fullFigure ? 1 : 0}\u0000${outfitIds}`
    const poseChanged = poseSigRef.current !== poseSig
    // Single-piece stages hide every mesh the garment itself does not paint, so
    // detect parts from the piece-only texture (the composed skin always has
    // the base body filling every region). Kicked off alongside the main
    // compose so the two image loads overlap.
    const piece = outfitRef.current[0]
    const partsPromise =
      !fullFigure && outfitRef.current.length === 1 && piece
        ? composePieceSkin(piece).then(partsFromAtlas).catch(() => undefined)
        : Promise.resolve(undefined)
    void Promise.all([composeSkin(outfitRef.current, bodyId, bodyHue, model), partsPromise])
      .then(([skin, paintedParts]) => {
        if (cancelled || viewerRef.current !== viewer) return
        viewer.loadSkin(skin, { model: viewerModelName(model) })
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
              fullFigure ? ["head", "torso", "legs"] : covers,
              true,
              paintedParts,
            )
          }
          replayRef.current = focus
          focus()
          // Commit only once the focus has actually landed on this viewer, so
          // StrictMode's discarded first effect pass cannot mark the pose as
          // applied and leave the second pass showing the bare mannequin.
          poseSigRef.current = poseSig
          // Soft 160ms fade on the re-posed frame so clothing swaps read as a
          // smooth transition. Web Animations API — no remount, so the WebGL
          // context survives. Never on hue drags (must be live) or under
          // reduced motion.
          if (!firstPaint.current) {
            const node = canvasRef.current
            const rimNode = fxRefs.current[1]
            if (
              (node || rimNode) &&
              !window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
              const fade = { duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" }
              // The rim overlay sits ABOVE the canvas, so it fades on its own
              // scale (its resting opacity is the class tint).
              const rimRest = piecePreviewRef.current ? PIECE_RIM_OPACITY : 0.6
              node?.animate([{ opacity: 0.55 }, { opacity: 1 }], fade)
              rimNode?.animate(
                [{ opacity: rimRest * 0.55 }, { opacity: rimRest }],
                fade,
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
  }, [bodyHue, bodyId, fullFigure, model, outfitIds, piecePreview])

  return (
    <div className={`skin-stage relative overflow-hidden bg-base-200 ${className}`}>
      {ready ? null : <div className="skin-bone absolute inset-0 z-10" aria-hidden />}
      <div className="skin-stage-inset">
        {ready ? (
          <canvas
            ref={(node) => {
              fxRefs.current[0] = node
            }}
            className="skin-stage-fx iso-thumb-shadow"
            aria-hidden
          />
        ) : null}
        <canvas
          ref={canvasRef}
          className={`skin-stage-canvas h-full w-full touch-none ${ready ? "" : "opacity-0"}`}
        />
        {ready ? (
          <canvas
            ref={(node) => {
              fxRefs.current[1] = node
            }}
            className="skin-stage-fx iso-thumb-rim"
            style={{ opacity: piecePreview ? PIECE_RIM_OPACITY : RIM_OPACITY }}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}
