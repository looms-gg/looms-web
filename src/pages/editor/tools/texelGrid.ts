import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Vector3,
} from "three"
import type { LimbId } from "./editorControls"

// Lift the grid off the surface along the face normal so depth testing can
// hide far-side lines behind the skin without z-fighting. Same magnitude as
// the brush preview's SURFACE_LIFT; the preview renders above with a bigger
// lift of its own.
export const GRID_LIFT = 0.03

const ATLAS_TEXELS = 64

type Uv = { u: number; v: number }
type Segment = [Vector3, Vector3]

const LIMBS: LimbId[] = ["head", "body", "rightArm", "leftArm", "rightLeg", "leftLeg"]

/**
 * Span of the axis-aligned lattice line `c` (on the u or v axis) clipped to a
 * triangle in UV space. Returns the [min, max] interval on the free axis, or
 * null when the line misses or only grazes the triangle.
 */
function latticeSpan(
  axis: "u" | "v",
  c: number,
  tri: [Uv, Uv, Uv],
): [number, number] | null {
  const crossings: number[] = []
  for (let i = 0; i < 3; i++) {
    const p = tri[i]
    const q = tri[(i + 1) % 3]
    const dp = (axis === "u" ? p.u : p.v) - c
    const dq = (axis === "u" ? q.u : q.v) - c
    const pf = axis === "u" ? p.v : p.u
    const qf = axis === "u" ? q.v : q.u
    if (dp === 0 && dq === 0) {
      // Whole edge lies on the line: contributes both endpoints.
      crossings.push(pf, qf)
    } else if (dp * dq <= 0) {
      const t = dp / (dp - dq)
      crossings.push(pf + t * (qf - pf))
    }
  }
  if (crossings.length < 2) return null
  const lo = Math.min(...crossings)
  const hi = Math.max(...crossings)
  return hi - lo > 1e-7 ? [lo, hi] : null
}

/**
 * Grid segments for one mesh: every texel boundary clipped to each face
 * triangle in UV space, mapped back through barycentric coords to world
 * positions, lifted along the face normal. This reproduces the exact texel
 * grid painting snaps to, on any layer mesh the stage renders.
 */
export function gridSegmentsForMesh(mesh: GridLayer): Segment[] {
  const geometry = mesh.geometry
  if (!geometry) return []
  const posAttr = geometry.getAttribute("position") as BufferAttribute | undefined
  const uvAttr = geometry.getAttribute("uv") as BufferAttribute | undefined
  if (!posAttr || !uvAttr) return []

  mesh.updateWorldMatrix(true, false)
  const m = mesh.matrixWorld.elements
  const toWorld = (v: { x: number; y: number; z: number }) =>
    new Vector3(
      m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12],
      m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13],
      m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14],
    )

  const index = geometry.getIndex()
  const triCount = (index ? index.count : posAttr.count) / 3
  const vertex = (i: number) => (index ? index.getX(i) : i)

  const segments: Segment[] = []
  for (let t = 0; t < triCount; t++) {
    const ia = vertex(t * 3)
    const ib = vertex(t * 3 + 1)
    const ic = vertex(t * 3 + 2)
    const tri: [Uv, Uv, Uv] = [
      { u: uvAttr.getX(ia), v: uvAttr.getY(ia) },
      { u: uvAttr.getX(ib), v: uvAttr.getY(ib) },
      { u: uvAttr.getX(ic), v: uvAttr.getY(ic) },
    ]
    const A = toWorld({ x: posAttr.getX(ia), y: posAttr.getY(ia), z: posAttr.getZ(ia) })
    const B = toWorld({ x: posAttr.getX(ib), y: posAttr.getY(ib), z: posAttr.getZ(ib) })
    const C = toWorld({ x: posAttr.getX(ic), y: posAttr.getY(ic), z: posAttr.getZ(ic) })

    // Barycentric map from UV space to world space for this triangle.
    const denom =
      (tri[1].v - tri[2].v) * (tri[0].u - tri[2].u) +
      (tri[2].u - tri[1].u) * (tri[0].v - tri[2].v)
    if (Math.abs(denom) < 1e-12) continue
    const worldAt = (p: Uv): Vector3 => {
      const wA =
        ((tri[1].v - tri[2].v) * (p.u - tri[2].u) +
          (tri[2].u - tri[1].u) * (p.v - tri[2].v)) /
        denom
      const wB =
        ((tri[2].v - tri[0].v) * (p.u - tri[2].u) +
          (tri[0].u - tri[2].u) * (p.v - tri[2].v)) /
        denom
      const wC = 1 - wA - wB
      return A.clone()
        .addScaledVector(B.clone().sub(A), wB)
        .addScaledVector(C.clone().sub(A), wC)
    }

    // Lift along the face's outward normal (from the geometry's own normals,
    // which skinview3d keeps correctly oriented), so depth testing hides the
    // far side of the grid behind the skin instead of x-raying through it.
    const nrmAttr = geometry.getAttribute("normal") as BufferAttribute | undefined
    const normal = nrmAttr
      ? new Vector3(nrmAttr.getX(ia), nrmAttr.getY(ia), nrmAttr.getZ(ia)).transformDirection(
          mesh.matrixWorld,
        )
      : new Vector3()
        .crossVectors(new Vector3().subVectors(B, A), new Vector3().subVectors(C, A))
        .normalize()
    const lift = normal.multiplyScalar(GRID_LIFT)

    const minU = Math.min(tri[0].u, tri[1].u, tri[2].u)
    const maxU = Math.max(tri[0].u, tri[1].u, tri[2].u)
    const minV = Math.min(tri[0].v, tri[1].v, tri[2].v)
    const maxV = Math.max(tri[0].v, tri[1].v, tri[2].v)
    const uStart = Math.ceil(minU * ATLAS_TEXELS - 1e-6)
    const uEnd = Math.floor(maxU * ATLAS_TEXELS + 1e-6)
    const vStart = Math.ceil(minV * ATLAS_TEXELS - 1e-6)
    const vEnd = Math.floor(maxV * ATLAS_TEXELS + 1e-6)

    for (let k = uStart; k <= uEnd; k++) {
      const span = latticeSpan("u", k / ATLAS_TEXELS, tri)
      if (!span) continue
      segments.push([
        worldAt({ u: k / ATLAS_TEXELS, v: span[0] }).add(lift),
        worldAt({ u: k / ATLAS_TEXELS, v: span[1] }).add(lift),
      ])
    }
    for (let v = vStart; v <= vEnd; v++) {
      const span = latticeSpan("v", v / ATLAS_TEXELS, tri)
      if (!span) continue
      segments.push([
        worldAt({ u: span[0], v: v / ATLAS_TEXELS }).add(lift),
        worldAt({ u: span[1], v: v / ATLAS_TEXELS }).add(lift),
      ])
    }
  }
  return segments
}

/**
 * Picks which layer to grid per limb: the top-most visible layer. When the
 * outer layer toggle is off for a limb, the body layer below shows the grid.
 * Visibility records may be partial: limbs they omit are never gridded, which
 * lets callers scope the grid to a single limb.
 */
/** The geometry-carrying surface the grid draws on: a box mesh at runtime. */
export type GridLayer = {
  geometry?: BufferGeometry
  matrixWorld: Matrix4
  updateWorldMatrix(updateParents: boolean, updateChildren: boolean): void
}

/** The limbs' layer meshes of a skinview3d SkinObject, keyed by limb id. */
export function topLayerMeshes(
  skin: Partial<Record<LimbId, { innerLayer?: GridLayer; outerLayer?: GridLayer }>>,
  bodyParts: Partial<Record<LimbId, boolean>>,
  armorParts: Partial<Record<LimbId, boolean>>,
): GridLayer[] {
  const meshes: GridLayer[] = []
  for (const limb of LIMBS) {
    const part = skin[limb]
    if (!part) continue
    if (armorParts[limb] && part.outerLayer) {
      meshes.push(part.outerLayer)
    } else if (bodyParts[limb] && part.innerLayer) {
      meshes.push(part.innerLayer)
    }
  }
  return meshes
}

export type TexelGrid = {
  line: LineSegments
  update: (meshes: GridLayer[]) => void
  dispose: () => void
}

/**
 * A reusable texel grid for the 3D scene. Geometry is rebuilt on each update;
 * the caller schedules a render through the shared frame queue.
 */
export function createTexelGrid(): TexelGrid {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(0), 3))
  const material = new LineBasicMaterial({
    color: 0x37474f,
    transparent: true,
    opacity: 0.35,
    // Depth-tested so the grid lives on the visible surface only: lines on
    // faces turned away are occluded by the skin instead of showing through.
    depthTest: true,
    depthWrite: false,
  })
  const line = new LineSegments(geometry, material)
  line.renderOrder = 5
  line.frustumCulled = false
  line.visible = false
  return {
    line,
    update(meshes: GridLayer[]) {
      const flat: number[] = []
      for (const mesh of meshes) {
        for (const [p, q] of gridSegmentsForMesh(mesh)) {
          flat.push(p.x, p.y, p.z, q.x, q.y, q.z)
        }
      }
      geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(flat), 3),
      )
      line.visible = flat.length > 0
    },
    dispose: () => {
      geometry.dispose()
      material.dispose()
    },
  }
}
