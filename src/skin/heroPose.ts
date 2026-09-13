import { Box3, Vector3 } from "three"
import { SkinViewer, type PlayerObject } from "skinview3d"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { piecesFromEquipped, equippedFromStack } from "../data/outfit"
import type { SkinModel } from "./convert"
import { composeSkin } from "./compose"
import { crispSkinTexture, expandVisible, lightSkinViewer, pauseViewerLoop, viewerModelName } from "./focus"
import { getStoredThumb, setStoredThumb } from "./thumbCache"
import { compositeIsoThumbFx } from "./thumbFx"
import { washFromCanvas } from "./wash"

export type HeroPose = "center" | "left" | "right"

/**
 * The narrow slice of a look the hero renderer needs. Structural, so a full
 * state-layer PublicLook satisfies it without the skin engine importing
 * upward across layers.
 */
export type HeroLook = {
  id: string
  stack: string[]
  bodyId?: string
  bodyHue?: number
  model?: SkinModel
}

export type HeroPoseThumbResult = {
  url: string
  wash: string
  // True when the look's stack references pieces the catalog registry has not
  // hydrated yet: the composed skin would be missing layers (a "naked" hero
  // figure). Never cached — the caller should retry once the catalog loads.
  pending?: boolean
}

const memCache = new Map<string, HeroPoseThumbResult>()
const inflight = new Map<string, Promise<HeroPoseThumbResult>>()
let viewer: SkinViewer | null = null

const fitBox = new Box3()
const fitSize = new Vector3()
const fitCenter = new Vector3()

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

function hasUnloadedPieces(stack: string[], pieces: { id: string }[]): boolean {
  return stack.some((id) => id && !pieces.some((p) => p.id === id))
}

function renderHeroFrame(
  v: SkinViewer,
  skin: HTMLCanvasElement,
  model: SkinModel,
  pose: HeroPose,
): void {
  // Hidden viewer: draw on demand only (RAF loop paused).
  pauseViewerLoop(v)
  v.loadSkin(skin, { model: viewerModelName(model) })
  applyHeroCameraPose(v.playerObject, pose)
  frameHeroCamera(v, pose)
  crispSkinTexture(v)
  v.render()
}

function captureViewerThumb(v: SkinViewer): string {
  // Bake the camera's framed bust as-is (no tile normalization): the hero
  // container displays it with `contain`, so normalizing to the tile fill
  // only shrank the characters.
  try {
    return compositeIsoThumbFx(v.canvas, v.canvas.width, v.canvas.height, {
      normalize: false,
      rim: 4,
      rimAlpha: 0.45,
    })
  } catch {
    return v.canvas.toDataURL("image/png")
  }
}

async function generateHeroThumb(
  look: HeroLook,
  pose: HeroPose,
): Promise<HeroPoseThumbResult> {
  const pieces = piecesFromEquipped(equippedFromStack(look.stack), look.stack)
  // Refuse to compose (and cache) while any stacked piece is still missing
  // from the registry: those slots would silently drop out of the skin.
  if (hasUnloadedPieces(look.stack, pieces)) {
    return { url: "", wash: "", pending: true }
  }

  const model = look.model ?? "classic"
  const skin = await composeSkin(
    pieces,
    look.bodyId ?? DEFAULT_BODY_ID,
    look.bodyHue ?? 0,
    model,
  )
  const wash = washFromCanvas(skin)

  let v: SkinViewer
  try {
    v = getHeroViewer()
  } catch {
    return { url: "", wash }
  }

  renderHeroFrame(v, skin, model, pose)
  const url = captureViewerThumb(v)
  return { url, wash }
}

export async function heroPosedLookThumb(
  look: HeroLook,
  pose: HeroPose,
): Promise<HeroPoseThumbResult> {
  const stackKey = look.stack.join("|") || "empty"
  // v11→v12: older entries may hold naked thumbs composed before the garment
  // catalog finished loading (missing pieces in the stack); the new key
  // ignores them. (v10→v11 already dropped poisoned { url: "" } failures.)
  // v12→v13: bake the hero camera's framing directly (skip tile normalization)
  // so the bust stays large. v13→v16: thicker rim outline and matching shadow.
  // v17: the rim became an inner overlay tinting the render's lit edge.
  // v18: hero busts use the lighter piece rim preset to match the app.
  // v19: thinner rim highlight (4px, 0.45 alpha) so large characters stay crisp.
  const key = `hero-bust:v19:${look.id}:${pose}:${look.bodyId}:${look.bodyHue}:${look.model}:${stackKey}`

  const hit = memCache.get(key)
  if (hit) return hit

  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async () => {
    const stored = await getStoredThumb<HeroPoseThumbResult>(key)
    if (stored) {
      memCache.set(key, stored)
      return stored
    }

    const res = await generateHeroThumb(look, pose)
    // Never cache a failed capture (empty url): the hero would show its
    // skeleton forever on every future visit.
    if (res.url) {
      memCache.set(key, res)
      setStoredThumb(key, res)
    }
    return res
  })()

  inflight.set(key, work)
  void work
    .finally(() => {
      if (inflight.get(key) === work) inflight.delete(key)
    })
    .catch(() => {})
  return work
}
