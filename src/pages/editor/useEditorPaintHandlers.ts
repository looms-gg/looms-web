import { useCallback, useEffect, useRef } from "react"
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react"
import { Box3, Raycaster, Vector2, Vector3, type Intersection, type Mesh } from "three"
import type { SkinViewer } from "skinview3d"
import { shrinkComposerTargets, viewPixelRatio } from "../../skin/viewer"
import { findCuboidFaceAtTexel, uvToTexel, type Point } from "./tools/editorMath"
import {
  basisAtTexel,
  createBrushPreviewLine,
  faceBasisFromIntersection,
  shapeOutlinePoints,
  wireframePoints,
  type BrushPreviewLine,
} from "./tools/brushPreview"
import { LIMB_PARTS } from "./useEditorViewer"
import type { LimbId, SkinEditorState } from "./useSkinEditor"

const LIMB_ORDER = Object.keys(LIMB_PARTS) as LimbId[]

// Stroke tools whose hover shows the brush footprint preview. Fill and picker
// tools have no sized stroke to preview.
const PREVIEW_TOOLS = new Set(["pencil", "eraser", "shading", "noise"])

type RayHit = {
  texel: Point
  uv: { x: number; y: number }
  hit: Intersection
  limb: LimbId | null
}

export function useEditorPaintHandlers({
  editor,
  viewerRef,
  canvasRef,
  viewerInstance,
  scheduleFrame,
  frameWorkRef,
  bodyParts,
  armorParts,
  hoveredLimbRef,
  gridRefreshRef,
  focusCameraRef,
}: {
  editor: SkinEditorState
  viewerRef: RefObject<SkinViewer | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewerInstance: SkinViewer | null
  scheduleFrame: () => void
  frameWorkRef: RefObject<(() => void) | null>
  bodyParts: Record<LimbId, boolean>
  armorParts: Record<LimbId, boolean>
  hoveredLimbRef: RefObject<LimbId | null>
  gridRefreshRef: RefObject<() => void>
  focusCameraRef: RefObject<(point: Vector3) => void>
}) {
  const raycasterRef = useRef(new Raycaster())
  const ndcRef = useRef(new Vector2())
  const isPaintingRef = useRef(false)
  const strokeFaceKeyRef = useRef<string | null>(null)
  const shapeStartRef = useRef<{ texel: Point; uv: { x: number; y: number }; faceKey: string | null } | null>(null)
  const shapeEndRef = useRef<Point | null>(null)
  const previewRef = useRef<BrushPreviewLine | null>(null)
  const hoverRef = useRef<{ x: number; y: number } | null>(null)
  // Signature of the last drawn footprint (texel + face + camera + brush).
  // The outline covers the same texels while the pointer drifts within one
  // texel, so matching signatures skip the geometry rewrite and the render.
  const previewSigRef = useRef<string | null>(null)
  // Move events land here and drain once per frame: touch and high-poll mice
  // emit several moves per rAF, and each one would otherwise raycast and
  // re-upload the 64x64 texture multiple times in a single frame.
  const pendingMoveRef = useRef(false)
  // Hover moves drain through their own rAF too (work only; a render is queued
  // solely when the footprint changes), so a 1000Hz pointer still raycasts at
  // most once per frame.
  const hoverWorkRef = useRef<number | null>(null)
  // True while a drag is being handed to the orbit controls: the cursor can
  // cross the model mid-orbit, but an orbiting user is not aiming to paint,
  // so the brush footprint preview and the texel grid stay hidden until the
  // pointer releases.
  const orbitingRef = useRef(false)
  // Limb the cursor rests on (owned by the stage, shared with the texel grid)
  // is cleared here whenever the pointer leaves the model.
  const clearHoveredLimb = useCallback(() => {
    if (hoveredLimbRef.current !== null) {
      hoveredLimbRef.current = null
      gridRefreshRef.current()
    }
  }, [gridRefreshRef, hoveredLimbRef])

  // A stroke started with the right button paints the secondary color until
  // the pointer releases.
  const secondaryRef = useRef(false)

  // Drags render at 1x device pixels so a retina stage does not pay 4x
  // fragments mid-stroke; the release restores the default ratio. Changing the
  // ratio reallocates the drawing buffer, which clears the canvas, so a frame
  // is queued here: the release path has no other work that would render one,
  // and a stale transparent canvas exposes the fx overlays as a black figure.
  const lowResRef = useRef(false)
  const setDragResolution = useCallback(
    (low: boolean) => {
      const viewer = viewerRef.current
      if (!viewer || lowResRef.current === low) return
      lowResRef.current = low
      try {
        viewer.pixelRatio = low ? 1 : viewPixelRatio()
        shrinkComposerTargets(viewer)
      } catch {
        // Viewer torn down mid-drag; the next mount reads the default ratio
      }
      scheduleFrame()
    },
    [scheduleFrame, viewerRef],
  )

  const {
    model,
    beginStroke,
    applyStrokeAtTexel,
    commitShape,
    endStroke,
  } = editor
  const { tool, brushSize, brushShape, shapeKind } = editor.brush.data

  // Candidate meshes + object→limb lookup, rebuilt only when a layer toggle or
  // the viewer changes instead of on every hover raycast. The layer booleans
  // are the same source of truth the viewer uses to flip mesh .visible, so the
  // list never lags a toggle the way reading .visible would.
  const interactiveRef = useRef<{
    meshes: Mesh[]
    limbByObject: Map<unknown, LimbId>
  }>({ meshes: [], limbByObject: new Map() })
  useEffect(() => {
    const meshes: Mesh[] = []
    const limbByObject = new Map<unknown, LimbId>()
    const viewer = viewerRef.current
    if (viewer) {
      const skin = viewer.playerObject.skin
      for (const limb of LIMB_ORDER) {
        const part = skin[LIMB_PARTS[limb]]
        if (!part) continue
        if (armorParts[limb] && part.outerLayer) {
          meshes.push(part.outerLayer as Mesh)
          limbByObject.set(part.outerLayer, limb)
        }
        if (bodyParts[limb] && part.innerLayer) {
          meshes.push(part.innerLayer as Mesh)
          limbByObject.set(part.innerLayer, limb)
        }
      }
    }
    interactiveRef.current = { meshes, limbByObject }
  }, [armorParts, bodyParts, viewerInstance, viewerRef])

  // Raycasting helper
  const raycastHit = useCallback(
    (clientX: number, clientY: number): RayHit | null => {
      const canvas = canvasRef.current
      const viewer = viewerRef.current
      if (!canvas || !viewer) return null

      const rect = canvas.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(ndcRef.current, viewer.camera)
      const hits = raycasterRef.current.intersectObjects(interactiveRef.current.meshes, false)

      const hit = hits[0]
      const uv = hit?.uv
      if (uv) {
        return {
          texel: uvToTexel(uv.x, uv.y, 64),
          uv: { x: uv.x, y: uv.y },
          hit,
          limb: interactiveRef.current.limbByObject.get(hit.object) ?? null,
        }
      }
      return null
    },
    [canvasRef, viewerRef],
  )

  const hidePreview = useCallback(() => {
    const preview = previewRef.current
    if (preview?.line.visible) {
      preview.line.visible = false
      previewSigRef.current = null
      scheduleFrame()
    }
  }, [scheduleFrame])

  // Brush footprint preview: keep a wireframe line in the scene and redraw it
  // from an already-resolved raycast hit. Renders are scheduled through the
  // shared frame queue, and skipped entirely while the footprint still lands on
  // the texels it already covers.
  const drawBrushPreview = useCallback(
    (res: RayHit | null) => {
      const preview = previewRef.current
      const viewer = viewerRef.current
      if (!preview || !viewer) return
      if (!res) {
        clearHoveredLimb()
        return hidePreview()
      }
      if (hoveredLimbRef.current !== res.limb) {
        hoveredLimbRef.current = res.limb
        gridRefreshRef.current()
      }
      // The hovered limb is tracked for every tool so the texel grid follows
      // the cursor; only stroke tools go on to draw the footprint outline.
      if (!PREVIEW_TOOLS.has(tool)) return hidePreview()
      const basis = faceBasisFromIntersection(res.hit, viewer.camera)
      if (!basis) return hidePreview()
      const centered = basisAtTexel(basis, res.uv, brushSize)
      const face = res.hit.face
      const camera = viewer.camera.position
      const sig = [
        res.texel.x,
        res.texel.y,
        res.hit.object.id,
        face ? `${face.a}:${face.b}:${face.c}` : "",
        camera.x.toFixed(3),
        camera.y.toFixed(3),
        camera.z.toFixed(3),
        brushSize,
        brushShape,
      ].join("|")
      if (preview.line.visible && sig === previewSigRef.current) return
      previewSigRef.current = sig
      preview.updatePoints(wireframePoints(centered, brushShape, brushSize))
      preview.line.visible = true
      scheduleFrame()
    },
    [brushShape, brushSize, clearHoveredLimb, hidePreview, scheduleFrame, tool],
  )

  const updateBrushPreview = useCallback(() => {
    const preview = previewRef.current
    const viewer = viewerRef.current
    if (!preview || !viewer) return
    if (orbitingRef.current) {
      clearHoveredLimb()
      return hidePreview()
    }
    const hover = hoverRef.current
    if (!hover) {
      clearHoveredLimb()
      return hidePreview()
    }
    drawBrushPreview(raycastHit(hover.x, hover.y))
  }, [clearHoveredLimb, drawBrushPreview, hidePreview, raycastHit])

  const runHoverWork = useCallback(() => {
    hoverWorkRef.current = null
    if (!isPaintingRef.current) updateBrushPreview()
  }, [updateBrushPreview])

  const scheduleHoverWork = useCallback(() => {
    if (hoverWorkRef.current === null) {
      hoverWorkRef.current = requestAnimationFrame(runHoverWork)
    }
  }, [runHoverWork])

  useEffect(
    () => () => {
      if (hoverWorkRef.current !== null) cancelAnimationFrame(hoverWorkRef.current)
    },
    [],
  )

  // Add the preview line to the scene once the viewer exists
  useEffect(() => {
    if (!viewerInstance) return
    const preview = createBrushPreviewLine()
    viewerInstance.scene.add(preview.line)
    previewRef.current = preview
    return () => {
      viewerInstance.scene.remove(preview.line)
      preview.dispose()
      previewRef.current = null
    }
  }, [viewerInstance])

  // Keep the preview in sync when brush settings or tools change mid-hover
  useEffect(() => {
    updateBrushPreview()
  }, [brushShape, brushSize, tool, updateBrushPreview])

  const faceKeyAtTexel = useCallback(
    (texel: Point): string | null => {
      const faceHit = findCuboidFaceAtTexel(texel, model === "slim")
      return faceHit ? `${faceHit.cuboidName}:${faceHit.face}` : null
    },
    [model],
  )

  // Pointer event listeners for painting vs orbiting
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const viewer = viewerRef.current
    if (!viewer) return

    // Shift hands the drag to the controls as a camera pan (the button map
    // already reads PAN for this press), so it never paints.
    if (e.shiftKey) {
      secondaryRef.current = false
      isPaintingRef.current = false
      strokeFaceKeyRef.current = null
      orbitingRef.current = true
      viewer.controls.enabled = true
      setDragResolution(true)
      return
    }

    // Left paints the primary color, right paints the secondary color
    if (e.button === 0 || e.button === 2) {
      const res = raycastHit(e.clientX, e.clientY)
      if (res) {
        viewer.controls.enabled = false
        isPaintingRef.current = true
        secondaryRef.current = e.button === 2
        setDragResolution(true)
        if (tool === "shape") {
          // Shape drags commit once on release; only the undo snapshot starts here
          shapeStartRef.current = {
            texel: res.texel,
            uv: res.uv,
            faceKey: faceKeyAtTexel(res.texel),
          }
          shapeEndRef.current = res.texel
          beginStroke()
          return
        }
        strokeFaceKeyRef.current = faceKeyAtTexel(res.texel)
        hoverRef.current = { x: e.clientX, y: e.clientY }
        pendingMoveRef.current = false
        beginStroke()
        applyStrokeAtTexel(res.texel, { secondary: secondaryRef.current })
        updateBrushPreview()
        return
      }
    }

    // Otherwise pass to orbit controls
    viewer.controls.enabled = true
    isPaintingRef.current = false
    secondaryRef.current = false
    strokeFaceKeyRef.current = null
    orbitingRef.current = true
    setDragResolution(true)
  }

  // Right-drag paints; the browser menu would interrupt the stroke.
  const onContextMenu = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
  }

  // Shift + double-click focuses the clicked limb: the raycast hit's world
  // bounds center is what the camera swings onto.
  const onDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!e.shiftKey) return
    e.preventDefault()
    const res = raycastHit(e.clientX, e.clientY)
    if (!res) return
    const bounds = new Box3().setFromObject(res.hit.object)
    const point = bounds.isEmpty() ? res.hit.point.clone() : bounds.getCenter(new Vector3())
    focusCameraRef.current(point)
  }

  const updateShapePreview = useCallback(
    (res: RayHit | null) => {
      const start = shapeStartRef.current
      if (!start) return
      if (!res) return
      // The shape lives on the face where the drag started
      if (faceKeyAtTexel(res.texel) !== start.faceKey) return
      shapeEndRef.current = res.texel
      const viewer = viewerRef.current
      const basis = viewer ? faceBasisFromIntersection(res.hit, viewer.camera) : null
      if (previewRef.current && basis) {
        previewRef.current.updatePoints(
          shapeOutlinePoints(basis, res.uv, start.texel, res.texel, shapeKind),
        )
        previewRef.current.line.visible = true
        scheduleFrame()
      }
    },
    [faceKeyAtTexel, scheduleFrame, shapeKind],
  )

  // Per-frame pointer work, run by the viewer's frame loop before it renders.
  // Drains the latest queued move only — at most one raycast, one stroke
  // application, and one texture upload per frame.
  const processPointerWork = useCallback(() => {
    if (!pendingMoveRef.current) return
    pendingMoveRef.current = false
    const hover = hoverRef.current
    if (!hover) return

    if (!isPaintingRef.current) {
      updateBrushPreview()
      return
    }

    if (tool === "shape") {
      updateShapePreview(raycastHit(hover.x, hover.y))
      return
    }

    const res = raycastHit(hover.x, hover.y)
    if (!res) {
      // Dragged off the model: clear the face so re-entry starts a fresh segment
      strokeFaceKeyRef.current = null
    } else {
      const faceKey = faceKeyAtTexel(res.texel)
      // Crossing onto a different face clips to the new face and starts a
      // fresh segment instead of smearing a straight line across the UV atlas
      const resetSegment = faceKey !== strokeFaceKeyRef.current
      strokeFaceKeyRef.current = faceKey
      applyStrokeAtTexel(res.texel, { resetSegment, secondary: secondaryRef.current })
    }
    // Reuse the stroke's raycast for the footprint; the hit is the same point,
    // so a second raycast per frame is wasted.
    drawBrushPreview(res)
  }, [
    applyStrokeAtTexel,
    drawBrushPreview,
    faceKeyAtTexel,
    raycastHit,
    tool,
    updateBrushPreview,
    updateShapePreview,
  ])

  // The frame loop picks up the work function through this ref, so the loop
  // stays stable across re-renders while brush/tool state churns.
  useEffect(() => {
    frameWorkRef.current = processPointerWork
    return () => {
      if (frameWorkRef.current === processPointerWork) frameWorkRef.current = null
    }
  }, [frameWorkRef, processPointerWork])

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    hoverRef.current = { x: e.clientX, y: e.clientY }
    if (!isPaintingRef.current) {
      // Hover coalesces to one raycast per frame; the signature check inside
      // the preview schedules a render only when the footprint changes.
      scheduleHoverWork()
      return
    }
    // Painting defers to the frame loop: several moves can land per rAF, and
    // each one drains as a single raycast + stroke + texture upload.
    pendingMoveRef.current = true
    scheduleFrame()
  }

  const onPointerUp = () => {
    const viewer = viewerRef.current
    if (viewer) viewer.controls.enabled = true
    orbitingRef.current = false
    setDragResolution(false)
    if (isPaintingRef.current) {
      // Drain the last queued move synchronously so the stroke's final
      // segment is not lost if the release lands between frames.
      if (pendingMoveRef.current) processPointerWork()
      isPaintingRef.current = false
      if (tool === "shape") {
        const start = shapeStartRef.current
        const end = shapeEndRef.current
        if (start && end) {
          commitShape(start.texel, end, { secondary: secondaryRef.current })
        }
        shapeStartRef.current = null
        shapeEndRef.current = null
        if (previewRef.current?.line.visible) {
          previewRef.current.line.visible = false
          scheduleFrame()
        }
      }
      strokeFaceKeyRef.current = null
      secondaryRef.current = false
      endStroke()
    }
  }

  const onPointerLeave = () => {
    onPointerUp()
    hoverRef.current = null
    updateBrushPreview()
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onContextMenu, onDoubleClick }
}
