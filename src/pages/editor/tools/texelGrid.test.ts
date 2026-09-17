import { describe, it, expect } from "vitest"
import { BufferAttribute, BufferGeometry, Mesh, Vector3 } from "three"
import { Matrix4 } from "three"
import { GRID_LIFT, createTexelGrid, gridSegmentsForMesh, topLayerMeshes } from "./texelGrid"

function triangleMesh(): Mesh {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
  )
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 2),
  )
  return new Mesh(geometry)
}

function quadMesh(): Mesh {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3),
  )
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  return new Mesh(geometry)
}

const near = (a: Vector3, x: number, y: number, z: number) => {
  expect(Math.abs(a.x - x)).toBeLessThan(1e-6)
  expect(Math.abs(a.y - y)).toBeLessThan(1e-6)
  expect(Math.abs(a.z - z)).toBeLessThan(1e-6)
}

describe("gridSegmentsForMesh", () => {
  it("emits one lifted segment per grid line crossing a triangle", () => {
    const segments = gridSegmentsForMesh(triangleMesh())
    // 64 vertical + 64 horizontal lines with nonzero span inside the triangle
    expect(segments).toHaveLength(128)

    const c = 0.25
    const vertical = segments.find(
      ([p]) => Math.abs(p.x - c) < 1e-6 && Math.abs(p.y - 0) < 1e-6,
    )
    expect(vertical).toBeTruthy()
    near(vertical![0], c, 0, GRID_LIFT)
    near(vertical![1], c, 1 - c, GRID_LIFT)

    const horizontal = segments.find(
      ([p]) => Math.abs(p.x - 0) < 1e-6 && Math.abs(p.y - c) < 1e-6,
    )
    expect(horizontal).toBeTruthy()
    near(horizontal![0], 0, c, GRID_LIFT)
    near(horizontal![1], 1 - c, c, GRID_LIFT)
  })

  it("keeps every quad segment on the texel lattice inside the surface", () => {
    const segments = gridSegmentsForMesh(quadMesh())
    expect(segments.length).toBeGreaterThanOrEqual(130)
    for (const [p, q] of segments) {
      for (const v of [p, q]) {
        expect(v.x).toBeGreaterThanOrEqual(-1e-6)
        expect(v.x).toBeLessThanOrEqual(1 + 1e-6)
        expect(v.y).toBeGreaterThanOrEqual(-1e-6)
        expect(v.y).toBeLessThanOrEqual(1 + 1e-6)
        expect(v.x * 64).toBeCloseTo(Math.round(v.x * 64), 3)
        expect(v.y * 64).toBeCloseTo(Math.round(v.y * 64), 3)
        expect(v.z).toBeCloseTo(GRID_LIFT, 5)
      }
    }
  })

  it("maps segments through the mesh world matrix", () => {
    const mesh = triangleMesh()
    mesh.position.set(5, -2, 1)
    mesh.updateMatrixWorld(true)
    const segments = gridSegmentsForMesh(mesh)
    const c = 0.5
    const vertical = segments.find(
      ([p]) => Math.abs(p.x - (5 + c)) < 1e-6,
    )
    expect(vertical).toBeTruthy()
    near(vertical![0], 5 + c, -2, 1 + GRID_LIFT)
  })

  it("returns no segments for geometry without uv or position", () => {
    expect(gridSegmentsForMesh(new Mesh(new BufferGeometry()))).toEqual([])
  })
})

describe("topLayerMeshes", () => {
  const makeSkin = () => {
    const layer = (mark: "isInner" | "isOuter") => ({
      [mark]: true,
      visible: true,
      matrixWorld: new Matrix4(),
      updateWorldMatrix: () => {},
    })
    const part = () => ({
      visible: true,
      innerLayer: layer("isInner"),
      outerLayer: layer("isOuter"),
    })
    return {
      head: part(),
      body: part(),
      rightArm: part(),
      leftArm: part(),
      rightLeg: part(),
      leftLeg: part(),
    }
  }
  const allOn = { head: true, body: true, rightArm: true, leftArm: true, rightLeg: true, leftLeg: true }

  it("grids the outer layer while its toggle is on", () => {
    const skin = makeSkin()
    const meshes = topLayerMeshes(skin, allOn, allOn)
    expect(meshes).toHaveLength(6)
    expect(meshes.every((m) => "isOuter" in m && m.isOuter === true)).toBe(true)
  })

  it("falls back to the inner layer where the outer toggle is off", () => {
    const skin = makeSkin()
    const armor = { ...allOn, head: false, rightArm: false }
    const meshes = topLayerMeshes(skin, allOn, armor)
    expect(meshes.filter((m) => "isInner" in m && m.isInner === true)).toHaveLength(2)
    expect(meshes.filter((m) => "isOuter" in m && m.isOuter === true)).toHaveLength(4)
  })

  it("skips limbs with both layers off", () => {
    const skin = makeSkin()
    const off = { head: false, body: false, rightArm: false, leftArm: false, rightLeg: false, leftLeg: false }
    expect(topLayerMeshes(skin, off, off)).toEqual([])
  })
})

describe("createTexelGrid", () => {
  it("rebuilds geometry from meshes and hides when there is nothing to grid", () => {
    const grid = createTexelGrid()
    expect(grid.line.visible).toBe(false)

    grid.update([triangleMesh()])
    expect(grid.line.visible).toBe(true)
    const attr = grid.line.geometry.getAttribute("position") as BufferAttribute
    expect(attr.count).toBe(128 * 2)

    grid.update([])
    expect(grid.line.visible).toBe(false)

    grid.dispose()
  })
})
