import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three"

export type FrontArrow = {
  mesh: Mesh
  dispose: () => void
}

/**
 * The soles of the model sit below the wrapper origin: skinview3d lifts the
 * skin 8 units and the legs hang 24 below their pivot, so the ground plane is
 * at y = -16 (y = 0 is the chest, which is where the marker used to float).
 */
export const FEET_Y = -16

const ICON_SIZE = 7
const ICON_Z = 3 // clear of the toes at z ±2
const GROUND_LIFT = 0.02
const CANVAS_PX = 256

/**
 * A rounded arrow icon drawn with round caps and joins: a thick shaft under a
 * chevron head. Canvas strokes read as an icon glyph, unlike a hand-built
 * triangle mesh, which pinches at the corners.
 */
function paintRoundedArrow(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  // Some test/host environments stub a 2d context without the path API; the
  // marker still renders as a blank plane there rather than throwing.
  if (!ctx || typeof ctx.beginPath !== "function") return
  const s = canvas.width
  ctx.clearRect(0, 0, s, s)
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = s * 0.15
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.beginPath()
  ctx.moveTo(s * 0.5, s * 0.85)
  ctx.lineTo(s * 0.5, s * 0.3)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(s * 0.25, s * 0.5)
  ctx.lineTo(s * 0.5, s * 0.24)
  ctx.lineTo(s * 0.75, s * 0.5)
  ctx.stroke()
}

/**
 * A flat rounded-arrow icon lying on the ground in front of the character,
 * pointing toward the model's front (+Z). Parented to the playerWrapper by
 * the caller so it turns with the model.
 */
export function createFrontArrow(): FrontArrow {
  const canvas = document.createElement("canvas")
  canvas.width = CANVAS_PX
  canvas.height = CANVAS_PX
  paintRoundedArrow(canvas)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4

  const material = new MeshBasicMaterial({
    map: texture,
    color: 0x9aa0a6,
    transparent: true,
    opacity: 0.85,
    // Flat, unlit grey: no lighting rig involvement, no depth writes so the
    // marker never occludes the skin.
    depthWrite: false,
    side: DoubleSide,
  })

  const geometry = new PlaneGeometry(ICON_SIZE, ICON_SIZE)
  // Plane space is XY with the texture's top on +Y; dropping it onto the
  // ground turns that edge toward the model's front (+Z).
  geometry.rotateX(Math.PI / 2)
  geometry.translate(0, 0, ICON_Z + ICON_SIZE / 2)

  const mesh = new Mesh(geometry, material)
  mesh.position.y = FEET_Y + GROUND_LIFT
  mesh.renderOrder = 5
  mesh.frustumCulled = false

  return {
    mesh,
    dispose: () => {
      geometry.dispose()
      texture.dispose()
      material.dispose()
    },
  }
}
