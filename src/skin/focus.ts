import {
  Box3,
  Color,
  ColorManagement,
  DirectionalLight,
  NearestFilter,
  NoToneMapping,
  SRGBColorSpace,
  Vector3,
  type Object3D,
  type Mesh,
} from "three"
import { FunctionAnimation, SkinViewer, type PlayerObject } from "skinview3d"
import type { SkinModel } from "./convert"
import type { Group } from "../data/catalog"
import { flattenSkinMaterials } from "./materials"

export { flattenSkinMaterials } from "./materials"

const PARTS = ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"] as const
const BACK = 0.42
const AWAY = -1.6
const LEG_BACK = 0.18
const LEG_AWAY = -0.55

export function skinviewModel(model: SkinModel = "classic"): "slim" | "default" {
  return model === "slim" ? "slim" : "default"
}

export function poseIsoLimbs(player: PlayerObject, group: Group | "full") {
  const skin = player.skin
  // Wrapper yaw +π/4: right side nearer the camera. Same side back on shirts and boots.
  if (group === "torso" || group === "full") {
    skin.rightArm.rotation.x = BACK
    skin.leftArm.rotation.x = -BACK
    skin.rightArm.position.z = AWAY
    skin.leftArm.position.z = -AWAY
    skin.rightArm.position.x = -5.35
    skin.leftArm.position.x = 5.35
  }
  if (group === "legs" || group === "full") {
    skin.rightLeg.rotation.x = LEG_BACK
    skin.leftLeg.rotation.x = -LEG_BACK
    skin.rightLeg.position.z = LEG_AWAY
    skin.leftLeg.position.z = -LEG_AWAY
  }
}

/** Map visible body parts onto the iso pose group (torso+legs → full). */
export function poseGroupForParts(parts: readonly Group[]): Group | "full" {
  if (parts.includes("torso") && parts.includes("legs")) return "full"
  if (parts.includes("torso")) return "torso"
  if (parts.includes("legs")) return "legs"
  return "head"
}

export function isoPoseAnimation(group: Group | "full") {
  return new FunctionAnimation((player) => {
    poseIsoLimbs(player, group)
  })
}

export function crispSkinTexture(viewer: SkinViewer) {
  const map = viewer.playerObject.skin.map
  if (!map) return
  map.colorSpace = SRGBColorSpace
  map.magFilter = NearestFilter
  map.minFilter = NearestFilter
  map.generateMipmaps = false
  map.needsUpdate = true
  flattenSkinMaterials(viewer)
}

export function lightSkinViewer(viewer: SkinViewer) {
  ColorManagement.enabled = true
  viewer.renderer.shadowMap.enabled = false
  viewer.renderer.toneMapping = NoToneMapping
  viewer.renderer.outputColorSpace = SRGBColorSpace
  viewer.fxaaPass.enabled = false
  viewer.render = () => {
    viewer.renderer.render(viewer.scene, viewer.camera)
  }
  viewer.background = null
  viewer.renderer.setClearColor(0x000000, 0)

  viewer.globalLight.intensity = 1.15
  viewer.cameraLight.intensity = 0.35
  viewer.cameraLight.color = new Color(0xfff6ea)

  if (!viewer.scene.getObjectByName("loomsKeyLight")) {
    const key = new DirectionalLight(0xfff3dc, 1.85)
    key.name = "loomsKeyLight"
    key.position.set(-22, 38, 30)
    key.castShadow = false
    key.target = viewer.playerWrapper
    viewer.scene.add(key)

    const fill = new DirectionalLight(0xb8d4ff, 0.55)
    fill.name = "loomsFillLight"
    fill.position.set(26, 14, 10)
    fill.castShadow = false
    viewer.scene.add(fill)

    const rim = new DirectionalLight(0xffe8c8, 0.4)
    rim.name = "loomsRimLight"
    rim.position.set(8, 18, -28)
    rim.castShadow = false
    viewer.scene.add(rim)
  }
}

const fitBox = new Box3()
const meshBox = new Box3()
const fitCenter = new Vector3()
const ndcCorner = new Vector3()

// Still thumbs fill this fraction of the render canvas on the binding axis;
// the rest is clean viewport margin the normalized fx bake keeps.
const VIEW_FILL = 0.72

/**
 * Full painted NDC span at the current camera: 2 fills the whole canvas axis,
 * so w/2 (resp. h/2) is the fraction of the canvas width (height) the box
 * occupies. Overflows (>1) are fine — that is exactly what we zoom out of.
 */function ndcFill(viewer: SkinViewer, box: Box3): { w: number; h: number } {
  const camera = viewer.camera
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < 8; i++) {
    ndcCorner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z,
    ).project(camera)
    if (ndcCorner.x < minX) minX = ndcCorner.x
    if (ndcCorner.x > maxX) maxX = ndcCorner.x
    if (ndcCorner.y < minY) minY = ndcCorner.y
    if (ndcCorner.y > maxY) maxY = ndcCorner.y
  }
  return { w: maxX - minX, h: maxY - minY }
}

function expandVisible(obj: Object3D, box: Box3) {
  if (!obj.visible) return
  const mesh = obj as Mesh
  if (mesh.isMesh && mesh.geometry) {
    const geom = mesh.geometry
    if (!geom.boundingBox) geom.computeBoundingBox()
    if (geom.boundingBox && !geom.boundingBox.isEmpty()) {
      meshBox.copy(geom.boundingBox).applyMatrix4(mesh.matrixWorld)
      box.union(meshBox)
    }
  }
  for (const child of obj.children) expandVisible(child, box)
}

/** Center the visible silhouette and zoom so it fits the viewport with margin. */
function frameVisible(viewer: SkinViewer) {
  const wrapper = viewer.playerWrapper
  wrapper.position.set(0, 0, 0)
  wrapper.updateWorldMatrix(true, true)

  // Frame every visible mesh, so nothing (posed legs, long hair, splayed
  // arms) can fall outside the viewport no matter which shot the piece
  // nominally is. normalizeFigure handles the final crop/scale per piece.
  fitBox.makeEmpty()
  expandVisible(viewer.playerObject.skin, fitBox)
  if (fitBox.isEmpty()) {
    viewer.zoom = 0.8
    return
  }

  // Center the whole silhouette at the origin, then translate the measured
  // box with it. Measuring the *old* box after moving the wrapper projects
  // the figure from its previous position and produces nonsense zoom values.
  fitBox.getCenter(fitCenter)
  wrapper.position.set(-fitCenter.x, -fitCenter.y, -fitCenter.z)
  wrapper.updateWorldMatrix(true, true)
  fitBox.translate(fitCenter.clone().negate())
  viewer.camera.updateMatrixWorld()

  // Solve zoom so the projected silhouette fills VIEW_FILL of the canvas on
  // its binding axis. Measure the real projection at each candidate instead of
  // inverting skinview3d's distance formula: the viewer clamps camera distance
  // to [10, 256], which the closed form ignores, so pieces needing very tight
  // or very wide framing came out tiny or clipped. A monotonic search respects
  // the clamp and the perspective projection exactly.
  const target = VIEW_FILL * 2
  const spanAt = (zoom: number) => {
    viewer.zoom = zoom
    viewer.camera.updateMatrixWorld()
    const fill = ndcFill(viewer, fitBox)
    return Math.max(fill.w, fill.h)
  }
  let lo = 0.02
  let hi = 8
  if (spanAt(hi) > target) {
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2
      if (spanAt(mid) > target) hi = mid
      else lo = mid
    }
  } else {
    lo = hi
  }
  viewer.zoom = lo
}

/**
 * Hidden offscreen viewers render stills only — pause their RAF loops so the
 * main page doesn't burn CPU/GPU on frames nobody sees.
 */
export function pauseViewerLoop(viewer: SkinViewer) {
  viewer.renderPaused = true
}

/** Resume rendering (used by live viewers after still captures). */
export function resumeViewerLoop(viewer: SkinViewer) {
  viewer.renderPaused = false
}

/** Live previews (studio + piece pages). Stills keep a separate iso tilt. */
export const LIVE_VIEW = {
  fov: 38,
  // Set back from 0.78: full-height characters touched the stage edges; this
  // leaves breathing room around the standing figure.
  zoom: 0.62,
  tilt: 0,
  yaw: Math.PI / 4,
} as const

const STILL_TILT = 0.38

/** Keep the camera height fixed so left/right drag only spins. */
export function lockTurntable(viewer: SkinViewer) {
  viewer.controls.enablePan = false
  viewer.controls.update()
  const phi = viewer.controls.getPolarAngle()
  viewer.controls.minPolarAngle = phi
  viewer.controls.maxPolarAngle = phi
}

export function mountLiveViewer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const viewer = new SkinViewer({
    canvas,
    width,
    height,
    enableControls: true,
    background: undefined,
    fov: LIVE_VIEW.fov,
    zoom: LIVE_VIEW.zoom,
    preserveDrawingBuffer: true,
  })
  viewer.fxaaPass.enabled = false
  flattenSkinMaterials(viewer)
  lightSkinViewer(viewer)
  lockTurntable(viewer)
  return viewer
}

export function applyGroupFocus(
  viewer: SkinViewer,
  group: Group | "full",
  covers?: Group[],
  live = false,
) {
  const skin = viewer.playerObject.skin
  const parts = covers?.length
    ? covers
    : group === "full"
      ? (["head", "torso", "legs"] satisfies Group[])
      : [group]
  const show = {
    head: parts.includes("head"),
    body: parts.includes("torso"),
    rightArm: parts.includes("torso"),
    leftArm: parts.includes("torso"),
    rightLeg: parts.includes("legs"),
    leftLeg: parts.includes("legs"),
  }
  for (const part of PARTS) {
    skin[part].visible = show[part]
  }

  viewer.playerObject.cape.visible = false
  viewer.playerObject.elytra.visible = false
  viewer.playerObject.ears.visible = false
  viewer.playerObject.resetJoints()
  viewer.playerWrapper.rotation.set(
    live ? LIVE_VIEW.tilt : STILL_TILT,
    LIVE_VIEW.yaw,
    0,
  )
  poseIsoLimbs(viewer.playerObject, poseGroupForParts(parts))

  skin.head.outerLayer.visible = true
  skin.body.outerLayer.visible = true
  skin.rightArm.outerLayer.visible = true
  skin.leftArm.outerLayer.visible = true
  skin.rightLeg.outerLayer.visible = true
  skin.leftLeg.outerLayer.visible = true

  frameVisible(viewer)
  if (live) lockTurntable(viewer)
}
