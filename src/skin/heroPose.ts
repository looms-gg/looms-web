import { Box3, Vector3, type Object3D, type Mesh } from "three"
import { SkinViewer, type PlayerObject } from "skinview3d"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { piecesFromEquipped, equippedFromStack } from "../data/outfit"
import type { PublicLook } from "../state/publicLooks"
import { composeSkin } from "./compose"
import { crispSkinTexture, lightSkinViewer, pauseViewerLoop, skinviewModel } from "./focus"
import { compositeIsoThumbFx } from "./thumbFx"
import { washFromCanvas } from "./wash"

export type HeroPose = "center" | "left" | "right"

export type HeroPoseThumbResult = {
  url: string
  wash: string
}

const memCache = new Map<string, HeroPoseThumbResult>()
const inflight = new Map<string, Promise<HeroPoseThumbResult>>()
let viewer: SkinViewer | null = null

const DB_NAME = "looms_iso_cache_v1"
const STORE_NAME = "thumbnails"
let dbPromise: Promise<IDBDatabase | null> | null = null

function getDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

async function getStoredThumb(key: string): Promise<HeroPoseThumbResult | null> {
  const db = await getDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve((req.result as HeroPoseThumbResult) || null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function setStoredThumb(key: string, data: HeroPoseThumbResult) {
  void getDb().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction(STORE_NAME, "readwrite")
      tx.objectStore(STORE_NAME).put(data, key)
    } catch {
      // ignore
    }
  })
}

const fitBox = new Box3()
const meshBox = new Box3()
const fitSize = new Vector3()
const fitCenter = new Vector3()

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

export function applyHeroCameraPose(player: PlayerObject, pose: HeroPose) {
  const skin = player.skin
  player.resetJoints()

  skin.setInnerLayerVisible(true)
  skin.setOuterLayerVisible(true)
  player.cape.visible = false
  player.elytra.visible = false
  player.ears.visible = false

  if (pose === "center") {
    // Center friend: Hand/arm up reached around behind left friend's shoulder
    skin.head.rotation.set(-0.02, 0.02, -0.04)
    // Right arm (screen-left): raised up and draped around behind left friend
    skin.rightArm.rotation.set(0.30, 0.10, -1.05)
    // Left arm (screen-right): relaxed posture
    skin.leftArm.rotation.set(-0.06, -0.02, 0.16)
  } else if (pose === "left") {
    // Left friend: In front of center friend's hand, leaning in close
    skin.head.rotation.set(0.04, -0.18, 0.08)
    // Outer arm relaxed
    skin.rightArm.rotation.set(0.08, 0.04, -0.12)
    // Inner arm tucked close
    skin.leftArm.rotation.set(0.24, -0.08, 0.14)
  } else {
    // Right friend: Leaning close in toward center, smiling
    skin.head.rotation.set(0.04, 0.24, -0.08)
    // Inner arm (screen-left, towards center): leaning in close
    skin.rightArm.rotation.set(0.24, 0.08, -0.14)
    // Outer arm (screen-right): relaxed
    skin.leftArm.rotation.set(-0.08, -0.04, 0.16)
  }
}

export function frameHeroCamera(viewer: SkinViewer, pose: HeroPose) {
  const wrapper = viewer.playerWrapper
  // Yaw & slight roll lean: friends leaning inward together for a tight group portrait
  const yaw = pose === "center" ? 0 : pose === "left" ? 0.22 : -0.26
  const roll = pose === "center" ? 0 : pose === "left" ? 0.04 : -0.05
  const pitch = 0.02

  wrapper.rotation.set(pitch, yaw, roll)
  wrapper.position.set(0, 0, 0)
  wrapper.updateWorldMatrix(true, true)

  fitBox.makeEmpty()
  // Frame upper body (head, chest, arms) ensuring all limbs fit inside the canvas without any cutoff
  const skin = viewer.playerObject.skin
  expandVisible(skin.head, fitBox)
  expandVisible(skin.body, fitBox)
  expandVisible(skin.rightArm, fitBox)
  expandVisible(skin.leftArm, fitBox)

  if (fitBox.isEmpty()) {
    viewer.zoom = 1.3
    return
  }

  fitBox.getCenter(fitCenter)
  fitBox.getSize(fitSize)
  wrapper.position.set(-fitCenter.x, -fitCenter.y, -fitCenter.z)

  // Zoom level: zoom out comfortably so arm is never cut off at canvas edges
  const span = Math.max(fitSize.x, fitSize.y)
  viewer.zoom = Math.min(1.35, Math.max(1.15, 23.5 / span))
}

function getHeroViewer(): SkinViewer {
  if (viewer) return viewer
  try {
    const next = new SkinViewer({
      canvas: document.createElement("canvas"),
      width: 280,
      height: 310,
      renderPaused: true,
    })
    lightSkinViewer(next)
    crispSkinTexture(next)
    viewer = next
    return next
  } catch (err) {
    viewer = null
    throw err
  }
}

export async function heroPosedLookThumb(
  look: PublicLook,
  pose: HeroPose,
): Promise<HeroPoseThumbResult> {
  const stackKey = look.stack.join("|") || "empty"
  // v10→v11: older entries may hold poisoned { url: "" } failures that stuck
  // the hero on skeletons forever; the new key ignores them.
  const key = `hero-bust:v11:${look.id}:${pose}:${look.bodyId}:${look.bodyHue}:${look.model}:${stackKey}`

  const hit = memCache.get(key)
  if (hit) return hit

  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async () => {
    const stored = await getStoredThumb(key)
    if (stored) {
      memCache.set(key, stored)
      return stored
    }

    const pieces = piecesFromEquipped(equippedFromStack(look.stack), look.stack)
    const skin = await composeSkin(
      pieces,
      look.bodyId ?? DEFAULT_BODY_ID,
      look.bodyHue ?? 0,
      look.model ?? "classic",
    )
    const wash = washFromCanvas(skin)

    let v: SkinViewer
    try {
      v = getHeroViewer()
    } catch {
      return { url: "", wash }
    }

    // Hidden viewer: draw on demand only (RAF loop paused).
    pauseViewerLoop(v)
    v.loadSkin(skin, { model: skinviewModel(look.model ?? "classic") })
    applyHeroCameraPose(v.playerObject, pose)
    frameHeroCamera(v, pose)
    crispSkinTexture(v)
    v.render()

    // Bake shadow+rim fx into the capture (v9→v10: baked thumbs in cache).
    let url: string
    try {
      url = compositeIsoThumbFx(v.canvas, v.canvas.width, v.canvas.height)
    } catch {
      url = v.canvas.toDataURL("image/png")
    }
    const res: HeroPoseThumbResult = { url, wash }
    // Never cache a failed capture (empty url): the hero would show its
    // skeleton forever on every future visit.
    if (url) {
      memCache.set(key, res)
      setStoredThumb(key, res)
    }
    return res
  })()

  inflight.set(key, work)
  void work.finally(() => {
    if (inflight.get(key) === work) inflight.delete(key)
  })
  return work
}
