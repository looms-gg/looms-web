import {
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  Vector3,
  type Intersection,
  type PerspectiveCamera,
} from "three"
import type { BrushShape } from "./editorTools"
import type { ShapeKind } from "../useSkinEditor"
import type { Point } from "./editorMath"

export const ATLAS_TEXELS = 64

// Lift the wireframe a hair off the surface so it never z-fights with the skin
const SURFACE_LIFT = 0.03
const CIRCLE_SEGMENTS = 32

export type FaceBasis = {
  point: Vector3
  du: Vector3
  dv: Vector3
  normal: Vector3
}

/**
 * Converts a raycast hit into the brush footprint's placement on the face:
 * where to draw, how far one texel reaches in world space along each uv axis,
 * and the outward normal (camera-facing).
 */
export function faceBasisFromIntersection(
  hit: Intersection,
  camera: PerspectiveCamera,
  atlasSize = ATLAS_TEXELS,
): FaceBasis | null {
  const mesh = hit.object as Mesh
  const geometry = mesh.geometry as BufferGeometry
  const posAttr = geometry.attributes.position as BufferAttribute | undefined
  const uvAttr = geometry.attributes.uv as BufferAttribute | undefined
  const face = hit.face
  if (!posAttr || !uvAttr || !face) return null

  const a = new Vector3(posAttr.getX(face.a), posAttr.getY(face.a), posAttr.getZ(face.a))
  const b = new Vector3(posAttr.getX(face.b), posAttr.getY(face.b), posAttr.getZ(face.b))
  const c = new Vector3(posAttr.getX(face.c), posAttr.getY(face.c), posAttr.getZ(face.c))
  const m = mesh.matrixWorld.elements
  const toWorld = (v: { x: number; y: number; z: number }) =>
    new Vector3(
      m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12],
      m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13],
      m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14],
    )

  const pa = toWorld(a)
  const pb = toWorld(b)
  const pc = toWorld(c)

  const f1 = {
    x: uvAttr.getX(face.b) - uvAttr.getX(face.a),
    y: uvAttr.getY(face.b) - uvAttr.getY(face.a),
  }
  const f2 = {
    x: uvAttr.getX(face.c) - uvAttr.getX(face.a),
    y: uvAttr.getY(face.c) - uvAttr.getY(face.a),
  }
  const det = f1.x * f2.y - f1.y * f2.x
  if (Math.abs(det) < 1e-9) return null

  const e1 = pb.clone().sub(pa)
  const e2 = pc.clone().sub(pa)
  // Solve e1 = du * f1.x + dv * f1.y and e2 = du * f2.x + dv * f2.y (per uv unit)
  const du = e1
    .clone()
    .multiplyScalar(f2.y / det)
    .addScaledVector(e2, -f1.y / det)
  const dv = e2
    .clone()
    .multiplyScalar(f1.x / det)
    .addScaledVector(e1, -f2.x / det)

  // Per-texel steps
  const duTex = du.clone().divideScalar(atlasSize)
  const dvTex = dv.clone().divideScalar(atlasSize)

  const normal = new Vector3().crossVectors(duTex, dvTex).normalize()
  // Intersection points are already in world space
  const point = hit.point ? hit.point.clone() : pa.clone()
  const toCamera = camera.position.clone().sub(point)
  if (normal.dot(toCamera) < 0) {
    normal.negate()
  }

  return { point, du: duTex, dv: dvTex, normal }
}

// Brush stamps anchor so the clicked texel is always covered:
// size 1 -> {0}, 2 -> {0,1}, 3 -> {-1,0,1}, 4 -> {-1,0,1,2}
function brushAnchorOffset(size: number): number {
  const min = -Math.floor((size - 1) / 2)
  const max = Math.floor(size / 2)
  return (min + max + 1) / 2
}

/**
 * Positions the footprint center in world space given the hit uv, accounting
 * for the stamp's anchor so the outline covers exactly the painted texels.
 * Texel coords mirror uvToTexel (x from u, y from 1 - v); the v correction
 * runs opposite the uv-v axis because of that mirror.
 */
export function basisAtTexel(
  basis: FaceBasis,
  uv: { x: number; y: number },
  size: number,
  atlasSize = ATLAS_TEXELS,
): FaceBasis {
  const tx = Math.min(atlasSize - 1, Math.max(0, Math.floor(uv.x * atlasSize)))
  const fx = uv.x * atlasSize - tx
  const sy = (1 - uv.y) * atlasSize
  const ty = Math.min(atlasSize - 1, Math.max(0, Math.floor(sy)))
  const fy = sy - ty
  const anchor = brushAnchorOffset(size)
  const center = basis.point
    .clone()
    .addScaledVector(basis.du, anchor - fx)
    .addScaledVector(basis.dv, fy - anchor)
  return { point: center, du: basis.du, dv: basis.dv, normal: basis.normal }
}

/**
 * Wireframe vertices for the brush footprint: a closed square loop or a circle,
 * spanning `size` texels, lifted slightly along the face normal.
 */
export function wireframePoints(
  basis: FaceBasis,
  shape: BrushShape,
  size: number,
): Vector3[] {
  const half = size / 2

  if (shape === "circle") {
    const points: Vector3[] = []
    for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
      const theta = (i / CIRCLE_SEGMENTS) * Math.PI * 2
      points.push(
        basis.point
          .clone()
          .addScaledVector(basis.normal, SURFACE_LIFT)
          .addScaledVector(basis.du, half * Math.cos(theta))
          .addScaledVector(basis.dv, half * Math.sin(theta)),
      )
    }
    return points
  }

  return [
    basis.point.clone().addScaledVector(basis.normal, SURFACE_LIFT)
      .addScaledVector(basis.du, -half).addScaledVector(basis.dv, -half),
    basis.point.clone().addScaledVector(basis.normal, SURFACE_LIFT)
      .addScaledVector(basis.du, half)
      .addScaledVector(basis.dv, -half),
    basis.point.clone().addScaledVector(basis.normal, SURFACE_LIFT)
      .addScaledVector(basis.du, half)
      .addScaledVector(basis.dv, half),
    basis.point.clone().addScaledVector(basis.normal, SURFACE_LIFT)
      .addScaledVector(basis.du, -half)
      .addScaledVector(basis.dv, half),
  ]
}

/**
 * Wireframe vertices for the shape tool's drag preview: a rectangle outline or
 * an ellipse covering the dragged texel box, mapped into the face's world
 * space. Texel coords mirror uvToTexel (x from u, y from 1 - v), and the v
 * correction runs opposite the uv-v axis because of that mirror.
 */
export function shapeOutlinePoints(
  basis: FaceBasis,
  uv: { x: number; y: number },
  start: Point,
  end: Point,
  kind: ShapeKind,
  atlasSize = ATLAS_TEXELS,
): Vector3[] {
  const tx = Math.min(atlasSize - 1, Math.max(0, Math.floor(uv.x * atlasSize)))
  const fx = uv.x * atlasSize - tx
  const sy = (1 - uv.y) * atlasSize

  const x0 = Math.min(start.x, end.x)
  const y0 = Math.min(start.y, end.y)
  const x1 = Math.max(start.x, end.x) + 1
  const y1 = Math.max(start.y, end.y) + 1

  const world = (u: number, vTex: number) =>
    basis.point
      .clone()
      .addScaledVector(basis.normal, SURFACE_LIFT)
      .addScaledVector(basis.du, u - tx - fx)
      .addScaledVector(basis.dv, sy - vTex)

  if (kind === "rectangle") {
    return [world(x0, y0), world(x1, y0), world(x1, y1), world(x0, y1)]
  }

  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const a = (x1 - x0) / 2
  const b = (y1 - y0) / 2
  const points: Vector3[] = []
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const theta = (i / CIRCLE_SEGMENTS) * Math.PI * 2
    points.push(world(cx + a * Math.cos(theta), cy + b * Math.sin(theta)))
  }
  return points
}

/**
 * A reusable wireframe line for the 3D scene. The geometry is rewritten on each
 * brush move; the material renders on top of the skin.
 */
export type BrushPreviewLine = {
  line: Line
  updatePoints: (points: Vector3[]) => void
  dispose: () => void
}

export function createBrushPreviewLine(): BrushPreviewLine {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(0), 3))
  const material = new LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 })
  const line = new LineLoop(geometry, material)
  line.renderOrder = 10
  line.frustumCulled = false
  line.visible = false
  return {
    line,
    updatePoints(points: Vector3[]) {
      const flat = new Float32Array(points.length * 3)
      for (let i = 0; i < points.length; i++) {
        flat[i * 3] = points[i].x
        flat[i * 3 + 1] = points[i].y
        flat[i * 3 + 2] = points[i].z
      }
      geometry.setAttribute("position", new BufferAttribute(flat, 3))
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}
