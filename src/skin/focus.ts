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
import type { Group, Piece } from "../data/catalog"
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
const fitSize = new Vector3()
const fitCenter = new Vector3()
const ndcNow = new Vector3()
const ndcWant = new Vector3()
const ndcOrigin = new Vector3()

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

/** Put the chest in the middle of the frame. Posed arms throw off a full-mesh center. */
function centerBodyX(viewer: SkinViewer) {
  const camera = viewer.camera
  const wrapper = viewer.playerWrapper
  const body = viewer.playerObject.skin.body
  wrapper.updateWorldMatrix(true, true)
  camera.updateMatrixWorld()
  fitBox.makeEmpty()
  expandVisible(body, fitBox)
  if (fitBox.isEmpty()) return
  fitBox.getCenter(fitCenter)
  fitCenter.project(camera)
  ndcOrigin.set(0, 0, 0).project(camera)
  ndcNow.set(fitCenter.x, fitCenter.y, ndcOrigin.z).unproject(camera)
  ndcWant.set(0, fitCenter.y, ndcOrigin.z).unproject(camera)
  wrapper.position.addScaledVector(ndcWant.sub(ndcNow), 0.4)
}

export type IsoStillShot = "fit" | "coat" | "long" | "shoes" | "pants"

/** Shirt/coat that paints legs but not a hood: chest in the middle, hems hang below. */
export function isoStillShot(
  outfit: Piece[],
  shown: { head: boolean; body: boolean; legs: boolean },
): IsoStillShot {
  if (outfit.length > 0 && outfit.every((piece) => piece.slot === "shoes")) return "shoes"
  if (outfit.length === 1 && outfit[0]?.slot === "pants") return "pants"
  const top =
    outfit.length === 1 &&
    (outfit[0]?.slot === "coat" || outfit[0]?.slot === "shirt")
  if (top && shown.body && shown.legs && !shown.head) return "long"
  if (top) return "coat"
  return "fit"
}

/** Center visible meshes at the origin and zoom from their bounds. */
function frameVisible(viewer: SkinViewer, shot: IsoStillShot) {
  const wrapper = viewer.playerWrapper
  wrapper.position.set(0, 0, 0)
  wrapper.updateWorldMatrix(true, true)
  fitBox.makeEmpty()
  expandVisible(viewer.playerObject.skin, fitBox)
  if (fitBox.isEmpty()) {
    viewer.zoom = 0.8
    return
  }
  if (shot === "pants") {
    const skin = viewer.playerObject.skin
    fitBox.makeEmpty()
    expandVisible(skin.rightLeg, fitBox)
    expandVisible(skin.leftLeg, fitBox)
    if (fitBox.isEmpty()) {
      viewer.zoom = 0.8
      return
    }
  }
  if (shot === "long") {
    const skin = viewer.playerObject.skin
    fitBox.makeEmpty()
    expandVisible(skin.body, fitBox)
    expandVisible(skin.rightArm, fitBox)
    expandVisible(skin.leftArm, fitBox)
    if (fitBox.isEmpty()) {
      viewer.zoom = 0.8
      return
    }
  }

  fitBox.getCenter(fitCenter)
  fitBox.getSize(fitSize)

  if (shot === "shoes") {
    const footH = fitSize.y * 0.34
    fitCenter.y = fitBox.min.y + footH * 0.55
    fitSize.y = footH
  }

  wrapper.position.set(-fitCenter.x, -fitCenter.y, -fitCenter.z)

  if (shot === "coat") {
    viewer.zoom = 1.02
    centerBodyX(viewer)
    return
  }

  if (shot === "long") {
    viewer.zoom = 1.02
    centerBodyX(viewer)
    return
  }

  if (shot === "pants") {
    const span = Math.max(fitSize.x, fitSize.y)
    viewer.zoom = Math.min(1.62, Math.max(1.18, 11.8 / span))
    return
  }

  if (shot === "shoes") {
    const span = Math.max(fitSize.x, fitSize.y)
    viewer.zoom = Math.min(1.62, Math.max(1.28, 16.5 / span))
    return
  }

  const span = Math.max(fitSize.x, fitSize.y)
  viewer.zoom = Math.min(1.28, Math.max(0.74, 20 / span))
}

/** Live previews (studio + piece pages). Stills keep a separate iso tilt. */
export const LIVE_VIEW = {
  fov: 38,
  zoom: 0.78,
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
  outfit: Piece[] = [],
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

  frameVisible(
    viewer,
    isoStillShot(outfit, {
      head: show.head,
      body: show.body,
      legs: show.rightLeg || show.leftLeg,
    }),
  )
  if (live) lockTurntable(viewer)
}
