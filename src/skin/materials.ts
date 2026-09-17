import {
  DoubleSide,
  MeshStandardMaterial,
  type Material,
  type Mesh,
  type Side,
  type Texture,
} from "three"
import type { SkinViewer } from "skinview3d"

type SkinMaterials = {
  map: Texture | null
  layer1Material: Material
  layer1MaterialBiased: Material
  layer2Material: Material
  layer2MaterialBiased: Material
}

type FlatMaterialOpts = {
  side: Side
  polygonOffset?: boolean
}

/** One recipe for both fresh materials and refits of skinview3d's own. */
function flatMaterialProps(opts: FlatMaterialOpts, withColor: boolean) {
  return {
    // MeshStandardMaterial.color is a THREE.Color instance: assigning the raw
    // number through Object.assign would clobber it (shader reads undefined
    // channels and renders black), so only the constructor path sets color.
    ...(withColor ? { color: 0xffffff } : {}),
    side: opts.side,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
    transparent: true,
    alphaTest: 1 / 255,
    depthWrite: true,
    toneMapped: false,
    ...(opts.polygonOffset
      ? {
          polygonOffset: true,
          polygonOffsetFactor: 1.0,
          polygonOffsetUnits: 1.0,
        }
      : {}),
  }
}

function createFlatMaterial(map: Texture | null, opts: FlatMaterialOpts) {
  return new MeshStandardMaterial({ map, ...flatMaterialProps(opts, true) })
}

export function freshFlatMaterial(opts: FlatMaterialOpts) {
  return createFlatMaterial(null, opts)
}

function applyFlatMaterial(mat: MeshStandardMaterial, opts: FlatMaterialOpts) {
  Object.assign(mat, flatMaterialProps(opts, false))
}

export function refitFlatMaterial(mat: MeshStandardMaterial, opts: FlatMaterialOpts) {
  applyFlatMaterial(mat, opts)
}

function ensureFlatMaterial(
  current: Material,
  map: Texture | null,
  opts: FlatMaterialOpts,
): Material {
  if (!(current instanceof MeshStandardMaterial)) {
    current.dispose()
    return createFlatMaterial(map, opts)
  }
  applyFlatMaterial(current, opts)
  return current
}

function setMeshMat(layer: unknown, mat: Material) {
  ;(layer as { material?: Material | Material[] }).material = mat
}

export function flattenSkinMaterials(viewer: SkinViewer) {
  const currentMap = viewer.playerObject.skin.map ?? null
  const skin = viewer.playerObject.skin as unknown as SkinMaterials

  skin.layer1Material = ensureFlatMaterial(skin.layer1Material, currentMap, {
    side: DoubleSide,
  })
  skin.layer1MaterialBiased = ensureFlatMaterial(skin.layer1MaterialBiased, currentMap, {
    side: DoubleSide,
    polygonOffset: true,
  })
  skin.layer2Material = ensureFlatMaterial(skin.layer2Material, currentMap, {
    side: DoubleSide,
  })
  skin.layer2MaterialBiased = ensureFlatMaterial(skin.layer2MaterialBiased, currentMap, {
    side: DoubleSide,
    polygonOffset: true,
  })

  for (const mat of [
    skin.layer1Material,
    skin.layer1MaterialBiased,
    skin.layer2Material,
    skin.layer2MaterialBiased,
  ] as MeshStandardMaterial[]) {
    mat.map = currentMap
    mat.needsUpdate = true
  }

  setMeshMat(viewer.playerObject.skin.head.innerLayer, skin.layer1Material)
  setMeshMat(viewer.playerObject.skin.head.outerLayer, skin.layer2Material)
  setMeshMat(viewer.playerObject.skin.body.innerLayer, skin.layer1Material)
  setMeshMat(viewer.playerObject.skin.body.outerLayer, skin.layer2Material)

  setMeshMat(viewer.playerObject.skin.rightArm.innerLayer, skin.layer1MaterialBiased)
  setMeshMat(viewer.playerObject.skin.rightArm.outerLayer, skin.layer2MaterialBiased)
  setMeshMat(viewer.playerObject.skin.leftArm.innerLayer, skin.layer1MaterialBiased)
  setMeshMat(viewer.playerObject.skin.leftArm.outerLayer, skin.layer2MaterialBiased)

  setMeshMat(viewer.playerObject.skin.rightLeg.innerLayer, skin.layer1MaterialBiased)
  setMeshMat(viewer.playerObject.skin.rightLeg.outerLayer, skin.layer2MaterialBiased)
  setMeshMat(viewer.playerObject.skin.leftLeg.innerLayer, skin.layer1MaterialBiased)
  setMeshMat(viewer.playerObject.skin.leftLeg.outerLayer, skin.layer2MaterialBiased)

  viewer.playerObject.skin.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = false
    mesh.receiveShadow = false
    const mat = mesh.material
    if (mat instanceof MeshStandardMaterial && mat.map !== currentMap) {
      mat.map = currentMap
      mat.needsUpdate = true
    }
  })
}
