import { describe, expect, it } from "vitest"
import { CanvasTexture } from "three"
import type { MeshBasicMaterial, PlaneGeometry } from "three"
import { createFrontArrow, FEET_Y } from "./frontArrow"

describe("createFrontArrow", () => {
  it("lays a flat icon plane on the ground at the model's feet", () => {
    const { mesh } = createFrontArrow()
    const geometry = mesh.geometry as PlaneGeometry
    expect(geometry.type).toBe("PlaneGeometry")
    // The skin sits 8 units above the wrapper origin and the legs reach 24
    // below theirs, so the soles land at y = -16, not at the chest at y = 0.
    expect(mesh.position.y).toBeCloseTo(FEET_Y, 1)

    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.y - box.min.y).toBeLessThan(0.01) // no tilt, flat on the ground
  })

  it("sits just in front of the toes, centered, reaching forward", () => {
    const { mesh } = createFrontArrow()
    const geometry = mesh.geometry as PlaneGeometry
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!

    // Legs span z ±2 at the soles, so the icon starts clear of the toes.
    expect(box.min.z).toBeGreaterThan(2)
    expect(box.max.z).toBeLessThan(12)
    expect(Math.abs(box.min.x + box.max.x)).toBeLessThan(0.001)
  })

  it("paints a grey rounded-arrow icon texture that does not write depth", () => {
    const { mesh } = createFrontArrow()
    const material = mesh.material as MeshBasicMaterial
    expect(material.map).toBeInstanceOf(CanvasTexture)
    expect(mesh.visible).toBe(true)
    expect(material.transparent).toBe(true)
    expect(material.depthWrite).toBe(false)

    const { r, g, b } = material.color
    expect(Math.abs(r - g)).toBeLessThan(0.05)
    expect(Math.abs(g - b)).toBeLessThan(0.05)
  })

  it("disposes geometry, texture and material", () => {
    const { mesh, dispose } = createFrontArrow()
    const material = mesh.material as MeshBasicMaterial
    const disposed: string[] = []
    mesh.geometry.addEventListener("dispose", () => disposed.push("geometry"))
    material.addEventListener("dispose", () => disposed.push("material"))
    material.map?.addEventListener("dispose", () => disposed.push("texture"))
    dispose()
    expect(disposed).toEqual(["geometry", "texture", "material"])
  })
})
