import { describe, it, expect } from "vitest"
import { Vector2, Vector3, PerspectiveCamera, BufferGeometry, BufferAttribute, Mesh, Matrix4, BoxGeometry } from "three"
import {
  basisAtTexel,
  faceBasisFromIntersection,
  shapeOutlinePoints,
  wireframePoints,
  ATLAS_TEXELS,
} from "./brushPreview"

const RAD_ATLAS = ATLAS_TEXELS

function makeHit({
  corners,
  uvs,
}: {
  corners: [number, number, number][]
  uvs: [number, number][]
}) {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(corners.flat()), 3),
  )
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs.flat()), 2))
  const mesh = new Mesh(geometry)
  mesh.updateMatrixWorld()
  const index = { a: 0, b: 1, c: 2 } as const
  return {
    object: mesh,
    face: { ...index, normal: new Vector3(0, 0, 1), materialIndex: 0 },
    uv: new Vector2(uvs[0][0], uvs[0][1]),
    point: new Vector3(...corners[0]),
  } as unknown as Parameters<typeof faceBasisFromIntersection>[0]
}

describe("brushPreview", () => {
  const camera = new PerspectiveCamera()
  camera.position.set(0, 0, 10)

  it("derives one world texel step from a flat unit quad", () => {
    // A quad whose uv spans [0, 8/64] over world x [0, 8]: one texel = 1 world unit
    const hit = makeHit({
      corners: [
        [0, 0, 0],
        [8, 0, 0],
        [8, 8, 0],
      ],
      uvs: [
        [0, 0],
        [8 / RAD_ATLAS, 0],
        [8 / RAD_ATLAS, 8 / RAD_ATLAS],
      ],
    })
    const basis = faceBasisFromIntersection(hit, camera)
    expect(basis).not.toBeNull()
    expect(basis!.du.length()).toBeCloseTo(1, 5)
    expect(basis!.dv.length()).toBeCloseTo(1, 5)
  })

  it("aligns the wireframe with the face and sizes it to the brush footprint", () => {
    const hit = makeHit({
      corners: [
        [0, 0, 0],
        [8, 0, 0],
        [8, 8, 0],
      ],
      uvs: [
        [0, 0],
        [8 / RAD_ATLAS, 0],
        [8 / RAD_ATLAS, 8 / RAD_ATLAS],
      ],
    })
    const basis = faceBasisFromIntersection(hit, camera)!
    // Size 4 square brush centered in a texel: spans 4 texels -> 4 world units
    const points = wireframePoints(basis, "square", 4)
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4, 5)
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(4, 5)
    // All four corners share the face plane (z = 0 plus the small lift)
    for (const p of points) {
      expect(Math.abs(p.z)).toBeLessThan(0.1)
    }
  })

  it("places the wireframe over exactly the texels the stamp paints", () => {
    for (const size of [1, 2, 3, 4, 5]) {
      for (const fx of [0, 0.5, 0.9]) {
        for (const fy of [0, 0.5, 0.9]) {
          const tx = 20
          const ty = 12
          const u = (tx + fx) / RAD_ATLAS
          const v = 1 - (ty + fy) / RAD_ATLAS
          const hit = makeHit({
            corners: [
              [u * RAD_ATLAS, v * RAD_ATLAS, 0],
              [8, 0, 0],
              [8, 8, 0],
            ],
            uvs: [
              [u, v],
              [8 / RAD_ATLAS, 0],
              [8 / RAD_ATLAS, 8 / RAD_ATLAS],
            ],
          })
          const basis = faceBasisFromIntersection(hit, camera)!
          const centered = basisAtTexel(basis, { x: u, y: v }, size)
          const points = wireframePoints(centered, "square", size)
          const xs = points.map((p) => p.x)
          const ys = points.map((p) => p.y)
          const min = -Math.floor((size - 1) / 2)
          const max = Math.floor(size / 2)
          expect(Math.min(...xs)).toBeCloseTo(tx + min, 5)
          expect(Math.max(...xs)).toBeCloseTo(tx + max + 1, 5)
          // v is mirrored: texel y maps through (1 - v) * 64, and this quad
          // puts world y = v * 64, so the painted band sits at the high end
          expect(Math.min(...ys)).toBeCloseTo(64 - (ty + max + 1), 5)
          expect(Math.max(...ys)).toBeCloseTo(64 - (ty + min), 5)
        }
      }
    }
  })

  it("renders a circle with enough points to look round", () => {
    const hit = makeHit({
      corners: [
        [0, 0, 0],
        [8, 0, 0],
        [8, 8, 0],
      ],
      uvs: [
        [0, 0],
        [8 / RAD_ATLAS, 0],
        [8 / RAD_ATLAS, 8 / RAD_ATLAS],
      ],
    })
    const basis = faceBasisFromIntersection(hit, camera)!
    const points = wireframePoints(basis, "circle", 4)
    expect(points.length).toBeGreaterThanOrEqual(16)
    const xs = points.map((p) => p.x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4, 5)
  })

  it("returns null for degenerate uv triangles", () => {
    const hit = makeHit({
      corners: [
        [0, 0, 0],
        [8, 0, 0],
        [8, 8, 0],
      ],
      uvs: [
        [0, 0],
        [0, 0],
        [0, 0],
      ],
    })
    expect(faceBasisFromIntersection(hit, camera)).toBeNull()
  })

  it("maps transforms through the object matrix", () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([0, 0, 0, 8, 0, 0, 8, 8, 0]),
        3,
      ),
    )
    geometry.setAttribute(
      "uv",
      new BufferAttribute(
        new Float32Array([0, 0, 8 / RAD_ATLAS, 0, 8 / RAD_ATLAS, 8 / RAD_ATLAS]),
        2,
      ),
    )
    const mesh = new Mesh(geometry)
    mesh.matrix = new Matrix4().makeTranslation(100, 0, 0)
    mesh.matrixAutoUpdate = false
    mesh.updateMatrixWorld(true)
    const hit = {
      object: mesh,
      face: { a: 0, b: 1, c: 2, normal: new Vector3(0, 0, 1), materialIndex: 0 },
      uv: new Vector2(0, 0),
      point: new Vector3(100, 0, 0),
    } as unknown as Parameters<typeof faceBasisFromIntersection>[0]
    const basis = faceBasisFromIntersection(hit, camera)
    expect(basis!.du.length()).toBeCloseTo(1, 5)
    expect(basis!.point.x).toBeCloseTo(100, 5)
  })

  it("supports real box geometry with a proper uv atlas", () => {
    // Skin-like box: 8x8x8 with uv layout scaled like a head front face
    const geometry = new BoxGeometry(8, 8, 8)
    const mesh = new Mesh(geometry)
    mesh.updateMatrixWorld(true)
    const uvAttr = geometry.attributes.uv as BufferAttribute
    // Vertex 0-3 is +X face in BoxGeometry; pick a triangle and its uvs
    const a = 0
    const b = 1
    const c = 2
    const hit = {
      object: mesh,
      face: { a, b, c, normal: new Vector3(1, 0, 0), materialIndex: 0 },
      uv: new Vector2(uvAttr.getX(a), uvAttr.getY(a)),
      point: new Vector3(4, 0, 0),
    } as unknown as Parameters<typeof faceBasisFromIntersection>[0]
    const basis = faceBasisFromIntersection(hit, camera)
    expect(basis).not.toBeNull()
    // BoxGeometry default uvs span 0..1 per face; 8 world units over 8 texels
    // means one texel is 1 world unit only if uv span matches; just assert
    // the basis is well-formed and consistent on both axes.
    expect(basis!.du.length()).toBeCloseTo(basis!.dv.length(), 5)
  })

  describe("shapeOutlinePoints", () => {
    // Flat quad: world = (u * 64, v * 64). Texel y runs opposite v
    // (texel y = (1 - v) * 64), matching real skin faces, so a hit at texel
    // (10, 10) has uv (10/64, 54/64) and world point (10, 54).
    function flatBasis(hitUv: { x: number; y: number }) {
      const hit = makeHit({
        corners: [
          [hitUv.x * RAD_ATLAS, hitUv.y * RAD_ATLAS, 0],
          [64, 0, 0],
          [64, 64, 0],
        ],
        uvs: [
          [hitUv.x, hitUv.y],
          [1, 0],
          [1, 1],
        ],
      })
      return faceBasisFromIntersection(hit, camera)!
    }

    it("frames the dragged texel box as a rectangle outline", () => {
      const basis = flatBasis({ x: 10 / RAD_ATLAS, y: 54 / RAD_ATLAS })
      const points = shapeOutlinePoints(
        basis,
        { x: 10 / RAD_ATLAS, y: 54 / RAD_ATLAS },
        { x: 10, y: 10 },
        { x: 13, y: 13 },
        "rectangle",
      )
      expect(points).toHaveLength(4)
      expect(points[0].x).toBeCloseTo(10, 5)
      expect(points[0].y).toBeCloseTo(54, 5)
      expect(points[1].x).toBeCloseTo(14, 5)
      expect(points[1].y).toBeCloseTo(54, 5)
      expect(points[2].x).toBeCloseTo(14, 5)
      expect(points[2].y).toBeCloseTo(50, 5)
      expect(points[3].x).toBeCloseTo(10, 5)
      expect(points[3].y).toBeCloseTo(50, 5)
      // All corners sit on the face plane with the small lift
      for (const p of points) {
        expect(Math.abs(p.z)).toBeLessThan(0.1)
      }
    })

    it("frames the dragged texel box as an ellipse outline", () => {
      const basis = flatBasis({ x: 10 / RAD_ATLAS, y: 54 / RAD_ATLAS })
      const points = shapeOutlinePoints(
        basis,
        { x: 10 / RAD_ATLAS, y: 54 / RAD_ATLAS },
        { x: 10, y: 10 },
        { x: 13, y: 13 },
        "ellipse",
      )
      expect(points.length).toBeGreaterThanOrEqual(16)
      // First sample sits on the ellipse edge at the box's right side
      expect(points[0].x).toBeCloseTo(14, 5)
      expect(points[0].y).toBeCloseTo(52, 5)
    })

    it("accounts for sub-texel hit offsets so the outline hugs the texels", () => {
      // Hit lands mid-texel 20: fx = 0.5 shifts the world mapping by half a texel
      const basis = flatBasis({ x: 20.5 / RAD_ATLAS, y: 51.5 / RAD_ATLAS })
      const points = shapeOutlinePoints(
        basis,
        { x: 20.5 / RAD_ATLAS, y: 51.5 / RAD_ATLAS },
        { x: 20, y: 12 },
        { x: 23, y: 12 },
        "rectangle",
      )
      expect(points[0].x).toBeCloseTo(20, 5)
      expect(points[0].y).toBeCloseTo(52, 5)
      expect(points[1].x).toBeCloseTo(24, 5)
      expect(points[1].y).toBeCloseTo(52, 5)
      expect(points[2].x).toBeCloseTo(24, 5)
      expect(points[2].y).toBeCloseTo(51, 5)
    })
  })
})
