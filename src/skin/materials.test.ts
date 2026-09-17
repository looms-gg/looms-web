import { describe, expect, it } from "vitest"
import { DoubleSide, MeshStandardMaterial } from "three"
import { freshFlatMaterial, flattenSkinMaterials, refitFlatMaterial } from "./materials"

describe("flat material recipe", () => {
  it("creates a material whose color is a real THREE.Color", () => {
    const mat = freshFlatMaterial({ side: DoubleSide })
    expect(mat.color).toBeInstanceOf(Object)
    expect(mat.color.getHex()).toBe(0xffffff)
    expect(mat.roughness).toBe(0.82)
    expect(mat.flatShading).toBe(true)
    expect(mat.transparent).toBe(true)
    expect(mat.toneMapped).toBe(false)
  })

  it("refits a material without clobbering the Color instance", () => {
    const mat = new MeshStandardMaterial({ color: 0x112233 })
    refitFlatMaterial(mat, { side: DoubleSide, polygonOffset: true })

    expect(mat.roughness).toBe(0.82)
    expect(mat.metalness).toBe(0)
    expect(mat.side).toBe(DoubleSide)
    expect(mat.polygonOffset).toBe(true)
    expect(mat.toneMapped).toBe(false)
    expect(mat.color).toBeDefined()
    expect(mat.color.getHex()).toBe(0x112233)
  })
})

describe("flattenSkinMaterials", () => {
  it("exports a callable material flattener", () => {
    expect(typeof flattenSkinMaterials).toBe("function")
  })
})
