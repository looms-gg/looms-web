import { useCallback, useEffect, useRef } from "react"
import type { PointerEvent as ReactPointerEvent, RefObject } from "react"
import { Raycaster, Vector2, type Intersection, type Mesh } from "three"
import type { SkinViewer } from "skinview3d"
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

// Stroke tools whose hover shows the brush footprint preview. Fill and picker
// tools have no sized stroke to preview.
const PREVIEW_TOOLS = new Set(["pencil", "eraser", "shading", "noise"])

type RayHit = { texel: Point; uv: { x: number; y: number }; hit: Intersection }

export function useEditorPaintHandlers({
  editor,
  viewerRef,
  canvasRef,
  viewerInstance,
  scheduleFrame,
  frameWorkRef,
  bodyParts,
  armorParts,
}: {
  editor: SkinEditorState
  viewerRef: RefObject<SkinViewer | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewerInstance: SkinViewer | null
  scheduleFrame: () => void
  frameWorkRef: RefObject<(() => void) | null>
  bodyParts: Record<LimbId, boolean>
  armorParts: Record<LimbId, boolean>
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
  // True while a drag is being handed to the orbit controls: the cursor can
  // cross the model mid-orbit, but an orbiting user is not aiming to paint,
  // so the brush footprint preview stays hidden until the pointer releases.
  const orbitingRef = useRef(false)

  const {
    model,
    beginStroke,
    applyStrokeAtTexel,
    commitShape,
    endStroke,
  } = editor
  const { tool, brushSize, brushShape, shapeKind } = editor.brush.data

  // Find candidate meshes to intersect
  const getInteractiveMeshes = useCallback((): Mesh[] => {
    const viewer = viewerRef.current
    if (!viewer) return []
    const meshes: Mesh[] = []
    const skin = viewer.playerObject.skin

    for (const [limbKey, partName] of Object.entries(LIMB_PARTS)) {
      const part = skin[partName]
      if (!part || !part.visible) continue

      if (armorParts[limbKey as LimbId] && part.outerLayer && part.outerLayer.visible) {
        meshes.push(part.outerLayer as Mesh)
      }
      if (bodyParts[limbKey as LimbId] && part.innerLayer && part.innerLayer.visible) {
        meshes.push(part.innerLayer as Mesh)
      }
    }
    return meshes
  }, [armorParts, bodyParts, viewerRef])

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
      const meshes = getInteractiveMeshes()
      const hits = raycasterRef.current.intersectObjects(meshes, false)

      const hit = hits[0]
      const uv = hit?.uv
      if (uv) {
        return {
          texel: uvToTexel(uv.x, uv.y, 64),
          uv: { x: uv.x, y: uv.y },
          hit,
        }
      }
      return null
    },
    [canvasRef, getInteractiveMeshes, viewerRef],
  )

  // Brush footprint preview: keep a wireframe line in the scene and redraw it
  // on hover; renders are scheduled through the shared frame queue so hover
  // moves cost at most one coalesced frame per rAF — and none at all while
  // the footprint lands on the texels it already covers.
  const updateBrushPreview = useCallback(() => {
    const preview = previewRef.current
    const viewer = viewerRef.current
    const hover = hoverRef.current
    if (!preview || !viewer) return
    const hide = () => {
      if (preview.line.visible) {
        preview.line.visible = false
        previewSigRef.current = null
        scheduleFrame()
      }
    }
    if (orbitingRef.current) return hide()
    if (!hover || !PREVIEW_TOOLS.has(tool)) return hide()
    const res = raycastHit(hover.x, hover.y)
    if (!res) return hide()
    const basis = faceBasisFromIntersection(res.hit, viewer.camera)
    if (!basis) return hide()
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
  }, [brushShape, brushSize, raycastHit, scheduleFrame, tool])

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

    // Left click only for painting
    if (e.button === 0) {
      const res = raycastHit(e.clientX, e.clientY)
      if (res) {
        viewer.controls.enabled = false
        isPaintingRef.current = true
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
        applyStrokeAtTexel(res.texel)
        updateBrushPreview()
        return
      }
    }

    // Otherwise pass to orbit controls
    viewer.controls.enabled = true
    isPaintingRef.current = false
    strokeFaceKeyRef.current = null
    orbitingRef.current = true
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
      applyStrokeAtTexel(res.texel, { resetSegment })
    }
    updateBrushPreview()
  }, [
    applyStrokeAtTexel,
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
      // Hover stays event-driven: the signature check inside the preview
      // schedules a frame only when the footprint actually changes.
      updateBrushPreview()
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
    if (isPaintingRef.current) {
      // Drain the last queued move synchronously so the stroke's final
      // segment is not lost if the release lands between frames.
      if (pendingMoveRef.current) processPointerWork()
      isPaintingRef.current = false
      if (tool === "shape") {
        const start = shapeStartRef.current
        const end = shapeEndRef.current
        if (start && end) commitShape(start.texel, end)
        shapeStartRef.current = null
        shapeEndRef.current = null
        if (previewRef.current?.line.visible) {
          previewRef.current.line.visible = false
          scheduleFrame()
        }
      }
      strokeFaceKeyRef.current = null
      endStroke()
    }
  }

  const onPointerLeave = () => {
    onPointerUp()
    hoverRef.current = null
    updateBrushPreview()
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave }
}
