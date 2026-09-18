import { useCallback, useEffect, useRef } from "react"
import type { RefObject } from "react"
import { MOUSE, Vector3 } from "three"
import { SkinViewer } from "skinview3d"
import {
  crispSkinTexture,
  mountLiveViewer,
  viewerModelName,
} from "../../skin/viewer"
import { RIM_CSS_PX, paintStageFx } from "../../skin/stageFx"
import { createTexelGrid, topLayerMeshes, type TexelGrid } from "./tools/texelGrid"
import { createFrontArrow } from "./tools/frontArrow"
import type { LimbId, SkinEditorState } from "./useSkinEditor"
import type { SkinModel } from "../../skin/convert"

export const LIMB_PARTS: Record<
  LimbId,
  "head" | "body" | "rightArm" | "leftArm" | "rightLeg" | "leftLeg"
> = {
  head: "head",
  body: "body",
  rightArm: "rightArm",
  leftArm: "leftArm",
  rightLeg: "rightLeg",
  leftLeg: "leftLeg",
}

export function useEditorViewer({
  canvasRef,
  fxRefs,
  viewerRef,
  scheduleRef,
  frameWorkRef,
  viewerInstance,
  setViewerInstance,
  setReady,
  bufferCanvas,
  model,
  bodyParts,
  armorParts,
  gridVisible,
  subscribeTextureUpdate,
  hoveredLimbRef,
  gridRefreshRef,
  focusCameraRef,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  fxRefs: RefObject<(HTMLCanvasElement | null)[]>
  viewerRef: RefObject<SkinViewer | null>
  scheduleRef: RefObject<() => void>
  frameWorkRef: RefObject<(() => void) | null>
  viewerInstance: SkinViewer | null
  setViewerInstance: (viewer: SkinViewer | null) => void
  setReady: (ready: boolean) => void
  bufferCanvas: SkinEditorState["bufferCanvas"]
  model: SkinModel
  bodyParts: Record<LimbId, boolean>
  armorParts: Record<LimbId, boolean>
  gridVisible: boolean
  subscribeTextureUpdate: SkinEditorState["subscribeTextureUpdate"]
  hoveredLimbRef: RefObject<LimbId | null>
  gridRefreshRef: RefObject<() => void>
  focusCameraRef: RefObject<(point: Vector3) => void>
}) {
  const gridRef = useRef<TexelGrid | null>(null)
  // The fx overlays only change when the rendered silhouette does: a texture
  // edit, a camera move, a resize, or a visibility toggle. Marker-only frames
  // (brush footprint, texel grid) skip the two full-canvas readback copies.
  const fxDirtyRef = useRef(true)
  // True while the frame loop is running frameWork + render. A texture update
  // raised by that work is picked up by the render right after it, so it must
  // not queue a second, redundant frame.
  const renderInProgressRef = useRef(false)

  // Mount 3D SkinViewer — the same studio live viewer (mountLiveViewer), with
  // painter controls layered on top: pan to inspect limbs, polar clamps so
  // orbit cannot flip upside-down or clip underground.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement

    let viewer: SkinViewer
    try {
      viewer = mountLiveViewer(
        canvas,
        parent?.clientWidth || 400,
        parent?.clientHeight || 450,
        // The editor never reads the WebGL frame back (no stage fx, no still
        // capture), so skip drawing-buffer retention.
        { preserveDrawingBuffer: false },
      )
    } catch {
      return
    }

    viewerRef.current = viewer
    setViewerInstance(viewer)
    setReady(true)

    viewer.controls.enablePan = true
    // Right-drag is reserved for painting with the secondary color, so the
    // controls never claim it. Pan is Shift + left-drag (mapped below).
    if (viewer.controls.mouseButtons) viewer.controls.mouseButtons.RIGHT = undefined
    viewer.controls.minPolarAngle = Math.PI * 0.1 // ~18° (can paint top of head)
    viewer.controls.maxPolarAngle = Math.PI * 0.75 // ~135° (can paint under chin/boots)

    // Position camera focused on the head/upper body (y = 1) so zooming in
    // targets the face and chest instead of the crotch/pants
    const targetY = 1
    viewer.controls.target.set(0, targetY, 0)

    const dist = 4.5 + 16.5 / Math.tan(((viewer.fov / 180) * Math.PI) / 2) / viewer.zoom
    const polar = Math.PI / 2 - 0.08
    const azimuth = Math.PI / 4
    viewer.camera.position.set(
      dist * Math.sin(polar) * Math.sin(azimuth),
      targetY + dist * Math.cos(polar),
      dist * Math.sin(polar) * Math.cos(azimuth),
    )
    viewer.camera.lookAt(0, targetY, 0)
    viewer.controls.update()
    viewer.controls.saveState()

    // Studio SkinStage render pattern: paused RAF loop, one coalesced frame
    // per rAF. Every trigger (orbit/pan/zoom, paint strokes, resizes,
    // visibility toggles, brush previews) funnels into scheduleFrame, so idle
    // CPU/GPU cost is zero and drags cost one render + fx pass per frame.
    viewer.renderPaused = true
    // FX overlays repaint from the freshly rendered frame: punch-shadow
    // silhouette and inner rim band, same pattern as SkinStage's live view.
    // The editor's stage is far larger than the studio preview, and the fx
    // copies scale with canvas pixels, so the soft overlays render at half
    // device resolution (CSS-stretched back to full size).
    const paintFx = () => {
      const src = canvasRef.current
      if (src) paintStageFx(src, fxRefs.current, RIM_CSS_PX, 0.5)
    }
    let frame: number | null = null
    // Pixel size the fx overlays were last baked from. A resolution switch or
    // resize reallocates the drawing buffer, so overlays copied from the old
    // buffer must be recomputed even when nothing else dirtied them.
    let fxW = -1
    let fxH = -1
    const renderFrame = () => {
      frame = null
      renderInProgressRef.current = true
      try {
        // Pointer work (raycast, stroke application, brush preview) runs
        // against the pre-render camera state, then the frame bakes it in.
        frameWorkRef.current?.()
        viewer.render()
        const src = canvasRef.current
        if (src && (fxDirtyRef.current || src.width !== fxW || src.height !== fxH)) {
          paintFx()
          fxDirtyRef.current = false
          fxW = src.width
          fxH = src.height
        }
      } finally {
        renderInProgressRef.current = false
      }
    }
    const scheduleFrame = () => {
      if (frame === null) frame = requestAnimationFrame(renderFrame)
    }
    scheduleRef.current = scheduleFrame

    // Any camera change moves the silhouette, so the fx overlays must repaint.
    const onControlsChange = () => {
      fxDirtyRef.current = true
      scheduleFrame()
    }
    viewer.controls.addEventListener("change", onControlsChange)
    scheduleFrame()

    viewer.loadSkin(bufferCanvas, { model: viewerModelName(model) })
    crispSkinTexture(viewer)

    // Ground triangle marking the model's front (+Z), parented to the player
    // wrapper so it turns with the model.
    const frontArrow = createFrontArrow()
    viewer.playerWrapper.add(frontArrow.mesh)

    // Ensure skinCanvas has initial bufferCanvas pixels and skin is visible
    if (viewer.skinCanvas) {
      const sCtx = viewer.skinCanvas.getContext("2d", { willReadFrequently: true })
      if (sCtx) {
        sCtx.clearRect(0, 0, viewer.skinCanvas.width, viewer.skinCanvas.height)
        sCtx.drawImage(bufferCanvas, 0, 0)
      }
    }
    viewer.playerObject.skin.visible = true
    if (viewer.playerObject.skin.map) {
      viewer.playerObject.skin.map.needsUpdate = true
    }

    const ro = new ResizeObserver(() => {
      if (!parent) return
      const w = parent.clientWidth || 400
      const h = parent.clientHeight || 450
      viewer.setSize(w, h)
      fxDirtyRef.current = true
      scheduleFrame()
    })
    if (parent) ro.observe(parent)

    return () => {
      scheduleRef.current = () => {}
      if (frame !== null) cancelAnimationFrame(frame)
      viewer.controls.removeEventListener("change", onControlsChange)
      ro.disconnect()
      viewer.playerWrapper.remove(frontArrow.mesh)
      frontArrow.dispose()
      setViewerInstance(null)
      viewer.dispose()
      viewerRef.current = null
    }
  }, [bufferCanvas, model])

  // Texture updates
  useEffect(() => {
    return subscribeTextureUpdate(() => {
      const viewer = viewerRef.current
      if (!viewer) return

      // Synchronize bufferCanvas into viewer.skinCanvas
      const skinCanvas = viewer.skinCanvas
      if (skinCanvas) {
        const sCtx = skinCanvas.getContext("2d", { willReadFrequently: true })
        if (sCtx) {
          sCtx.clearRect(0, 0, skinCanvas.width, skinCanvas.height)
          sCtx.drawImage(bufferCanvas, 0, 0)
        }
      }

      viewer.playerObject.skin.visible = true
      const map = viewer.playerObject.skin.map
      if (map) {
        map.needsUpdate = true
      }
      fxDirtyRef.current = true
      // A texture update raised by the in-flight frame's own paint work is
      // rendered by that frame; only out-of-frame updates queue a new one.
      if (!renderInProgressRef.current) scheduleRef.current()
    })
  }, [bufferCanvas, subscribeTextureUpdate])

  // Sync limb and layer visibility
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const skin = viewer.playerObject.skin

    for (const [limbKey, partName] of Object.entries(LIMB_PARTS)) {
      const part = skin[partName]
      if (!part) continue
      const isInnerVisible = bodyParts[limbKey as LimbId]
      const isOuterVisible = armorParts[limbKey as LimbId]
      part.visible = isInnerVisible || isOuterVisible
      if (part.innerLayer) part.innerLayer.visible = isInnerVisible
      if (part.outerLayer) part.outerLayer.visible = isOuterVisible
    }
    fxDirtyRef.current = true
    scheduleRef.current()
  }, [armorParts, bodyParts])

  // Shift is a held modifier, and OrbitControls reads its button map when the
  // pointer goes down, before React's canvas handler runs. Tracking the key on
  // the window keeps the map correct ahead of the press it should affect.
  useEffect(() => {
    const buttons = viewerInstance?.controls?.mouseButtons
    if (!buttons) return
    const setPan = (on: boolean) => {
      buttons.LEFT = on ? MOUSE.PAN : MOUSE.ROTATE
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setPan(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setPan(false)
    }
    const handleBlur = () => setPan(false)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", handleBlur)
      setPan(false)
    }
  }, [viewerInstance])

  // Texel grid overlay: one line object in the scene for the viewer's lifetime.
  // Only the hovered limb's top-most visible layer carries the grid — when the
  // Layer 2 toggle is off for that limb, the Layer 1 body below it carries the
  // grid. With no limb under the cursor (including mid-orbit) the grid hides.
  const refreshGrid = useCallback(() => {
    const grid = gridRef.current
    const viewer = viewerRef.current
    if (!grid || !viewer) return
    if (!gridVisible) {
      if (grid.line.visible) {
        grid.line.visible = false
        scheduleRef.current()
      }
      return
    }
    // skinview3d ships layer meshes as Object3D in its d.ts, but at runtime
    // they are the box Meshes created in SkinObject; cast once at the seam.
    const skin = viewer.playerObject.skin as unknown as Parameters<typeof topLayerMeshes>[0]
    const hovered = hoveredLimbRef.current
    grid.update(
      hovered
        ? topLayerMeshes(
            skin,
            { [hovered]: bodyParts[hovered] },
            { [hovered]: armorParts[hovered] },
          )
        : [],
    )
    scheduleRef.current()
  }, [armorParts, bodyParts, gridVisible, hoveredLimbRef, scheduleRef, viewerRef])

  // Hover lives in the paint handlers (they own the raycast); they signal
  // through this ref so hover changes never re-render the stage.
  useEffect(() => {
    gridRefreshRef.current = refreshGrid
  }, [gridRefreshRef, refreshGrid])

  useEffect(() => {
    if (!viewerInstance) return
    const grid = createTexelGrid()
    viewerInstance.scene.add(grid.line)
    gridRef.current = grid
    return () => {
      viewerInstance.scene.remove(grid.line)
      grid.dispose()
      gridRef.current = null
    }
  }, [viewerInstance])

  useEffect(() => {
    refreshGrid()
  }, [viewerInstance, gridVisible, bodyParts, armorParts, model, refreshGrid])

  // Shift + double-click swings the camera onto the clicked limb while keeping
  // the current view direction: the target moves to the part, the camera keeps
  // its angle at a closer distance. Published through a ref so the paint
  // handlers, declared before this hook, can call it without a call-order swap
  // (the stage's effect order is load-bearing for its overlay objects).
  useEffect(() => {
    focusCameraRef.current = (point: Vector3) => {
      const viewer = viewerRef.current
      if (!viewer) return
      const controls = viewer.controls
      const direction = new Vector3().subVectors(viewer.camera.position, controls.target)
      const current = direction.length()
      direction.normalize()
      const distance = Math.max(2.4, current > 0 ? current * 0.55 : 2.4)
      controls.target.copy(point)
      viewer.camera.position.copy(point).addScaledVector(direction, distance)
      controls.update()
      fxDirtyRef.current = true
      scheduleRef.current()
    }
  }, [focusCameraRef, scheduleRef, viewerRef])

  const resetCamera = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.playerWrapper.position.set(0, 0, 0)
    viewer.playerWrapper.rotation.set(0, 0, 0)
    viewer.zoom = 0.64
    viewer.controls.reset()
    fxDirtyRef.current = true
    scheduleRef.current()
  }, [])

  return {
    resetCamera,
  }
}
