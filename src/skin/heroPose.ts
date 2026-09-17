import { Box3, Vector3 } from "three"
import { SkinViewer, type PlayerObject } from "skinview3d"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { piecesFromEquipped, equippedFromStack } from "../data/outfit"
import type { SkinModel } from "./convert"
import { composeSkin } from "./compose"
import { crispSkinTexture, expandVisible, lightSkinViewer, pauseViewerLoop, viewerModelName } from "./viewer"
import { runOnceInflight } from "./inflight"
import { getStoredThumb, setStoredThumb } from "./thumbCache"
import { canvasToPng, compositeIsoThumbFx, thumbImageToUrl, type ThumbImage } from "./thumbFx"
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
}

const memCache = new Map<string, HeroPoseThumbResult>()
const inflight = new Map<string, Promise<HeroPoseThumbResult>>()
// IndexedDB payload: the encoded PNG (Blob preferred, data URL fallback).
type StoredHeroThumb = { png: ThumbImage; wash: string }
let viewer: SkinViewer | null = null

// Render resolution for hero busts. 3x the display size so the PNG stays
// crisp on HiDPI screens at the bust's full CSS width (~425px). The baked fx
// (punch shadow, rim band) scale with the same factor to keep their visual
// thickness identical to the 1x bake. scripts/render-hero-skeletons.html
// mirrors these constants for the offline skeleton renders.
export const HERO_RENDER_SCALE = 3
const HERO_RIM = 4 * HERO_RENDER_SCALE
const HERO_PUNCH = 8 * HERO_RENDER_SCALE

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
      width: 280 * HERO_RENDER_SCALE,
      height: 310 * HERO_RENDER_SCALE,
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

async function captureViewerThumb(v: SkinViewer): Promise<ThumbImage> {
  // Bake the camera's framed bust as-is (no tile normalization): the hero
  // container displays it with `contain`, so normalizing to the tile fill
  // only shrank the characters.
  try {
    return await compositeIsoThumbFx(v.canvas, v.canvas.width, v.canvas.height, {
      normalize: false,
      rim: HERO_RIM,
      rimAlpha: 0.45,
      punchX: HERO_PUNCH,
      punchY: HERO_PUNCH,
    })
  } catch {
    return canvasToPng(v.canvas)
  }
}

async function generateHeroThumb(
  look: HeroLook,
  pose: HeroPose,
): Promise<{ png: ThumbImage; wash: string }> {
  const pieces = piecesFromEquipped(equippedFromStack(look.stack), look.stack)
  // Refuse to compose (and cache) while any stacked piece is still missing
  // from the registry: those slots would silently drop out of the skin.
  if (hasUnloadedPieces(look.stack, pieces)) {
    return { png: "", wash: "" }
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
    return { png: "", wash }
  }

  renderHeroFrame(v, skin, model, pose)
  const png = await captureViewerThumb(v)
  return { png, wash }
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
  // v20: busts render at 3x resolution (840x930) for HiDPI sharpness; fx offsets
  // scaled with the render so the baked shadow and rim look unchanged.
  // v21: thumbs store a PNG Blob instead of a base64 data URL (see piece v77).
  const key = `hero-bust:v21:${look.id}:${pose}:${look.bodyId}:${look.bodyHue}:${look.model}:${stackKey}`

  return runOnceInflight(memCache, inflight, key, async () => {
    const stored = await getStoredThumb<StoredHeroThumb>(key)
    if (stored) {
      const result: HeroPoseThumbResult = {
        url: thumbImageToUrl(stored.png),
        wash: stored.wash,
      }
      memCache.set(key, result)
      return result
    }

    const { png, wash } = await generateHeroThumb(look, pose)
    // Never cache a failed capture (empty image): the hero would show its
    // skeleton forever on every future visit. A Blob image is always real;
    // the data-URL fallback is empty-string when the capture failed.
    const failed = typeof png === "string" && !png
    if (!failed) {
      const result: HeroPoseThumbResult = { url: thumbImageToUrl(png), wash }
      memCache.set(key, result)
      setStoredThumb(key, { png, wash })
      return result
    }
    return { url: "", wash }
  })
}
