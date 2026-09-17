import { useCallback, useEffect, useRef } from "react"
import type { RefObject } from "react"
import { SkinViewer } from "skinview3d"
import {
  crispSkinTexture,
  mountLiveViewer,
  viewerModelName,
} from "../../skin/viewer"
import { RIM_CSS_PX, paintStageFx } from "../../skin/stageFx"
import { createTexelGrid, topLayerMeshes, type TexelGrid } from "./tools/texelGrid"
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
  viewerInstance,
  setViewerInstance,
  setReady,
  bufferCanvas,
  model,
  bodyParts,
  armorParts,
  gridVisible,
  subscribeTextureUpdate,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  fxRefs: RefObject<(HTMLCanvasElement | null)[]>
  viewerRef: RefObject<SkinViewer | null>
  scheduleRef: RefObject<() => void>
  viewerInstance: SkinViewer | null
  setViewerInstance: (viewer: SkinViewer | null) => void
  setReady: (ready: boolean) => void
  bufferCanvas: SkinEditorState["bufferCanvas"]
  model: SkinModel
  bodyParts: Record<LimbId, boolean>
  armorParts: Record<LimbId, boolean>
  gridVisible: boolean
  subscribeTextureUpdate: SkinEditorState["subscribeTextureUpdate"]
}) {
  const gridRef = useRef<TexelGrid | null>(null)

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
    const renderFrame = () => {
      frame = null
      viewer.render()
      paintFx()
    }
    const scheduleFrame = () => {
      if (frame === null) frame = requestAnimationFrame(renderFrame)
    }
    scheduleRef.current = scheduleFrame

    viewer.controls.addEventListener("change", scheduleFrame)
    scheduleFrame()

    viewer.loadSkin(bufferCanvas, { model: viewerModelName(model) })
    crispSkinTexture(viewer)

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
      scheduleFrame()
    })
    if (parent) ro.observe(parent)

    return () => {
      scheduleRef.current = () => {}
      if (frame !== null) cancelAnimationFrame(frame)
      viewer.controls.removeEventListener("change", scheduleFrame)
      ro.disconnect()
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
      scheduleRef.current()
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
    scheduleRef.current()
  }, [armorParts, bodyParts])

  // Texel grid overlay: one line object in the scene for the viewer's lifetime,
  // rebuilt whenever the grid toggle or a layer toggle changes. Each limb grids
  // its top-most visible layer only — when the Layer 2 toggle is off, the Layer
  // 1 body below it carries the grid.
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
    grid.update(topLayerMeshes(skin, bodyParts, armorParts))
    scheduleRef.current()
  }, [viewerInstance, gridVisible, bodyParts, armorParts, model])

  const resetCamera = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.playerWrapper.position.set(0, 0, 0)
    viewer.playerWrapper.rotation.set(0, 0, 0)
    viewer.zoom = 0.64
    viewer.controls.reset()
    scheduleRef.current()
  }, [])

  return {
    resetCamera,
  }
}
