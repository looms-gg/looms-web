import {
  BODY,
  CUBOID_FACES,
  HAT,
  HEAD,
  JACKET,
  LEFT_ARM,
  LEFT_LEG,
  LEFT_PANT,
  LEFT_SLEEVE,
  RIGHT_ARM,
  RIGHT_LEG,
  RIGHT_PANT,
  RIGHT_SLEEVE,
  SLIM_LEFT_ARM,
  SLIM_LEFT_SLEEVE,
  SLIM_RIGHT_ARM,
  SLIM_RIGHT_SLEEVE,
  type Cuboid,
  type CuboidFace,
  type Rect,
} from "../../../skin/uv"

export type Point = { x: number; y: number }

export function uvToTexel(u: number, v: number, size = 64): Point {
  const clampedU = Math.max(0, Math.min(1, u))
  const clampedV = Math.max(0, Math.min(1, v))
  const x = Math.min(size - 1, Math.max(0, Math.floor(clampedU * size)))
  const y = Math.min(size - 1, Math.max(0, Math.floor((1 - clampedV) * size)))
  return { x, y }
}

export function interpolateLine(p0: Point, p1: Point): Point[] {
  const points: Point[] = []
  const dx = Math.abs(p1.x - p0.x)
  const dy = Math.abs(p1.y - p0.y)
  const sx = p0.x < p1.x ? 1 : -1
  const sy = p0.y < p1.y ? 1 : -1
  let err = dx - dy
  let x = p0.x
  let y = p0.y

  while (true) {
    points.push({ x, y })
    if (x === p1.x && y === p1.y) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}

export function isWithinRect(p: Point, rect: Rect): boolean {
  return (
    p.x >= rect.x &&
    p.x < rect.x + rect.w &&
    p.y >= rect.y &&
    p.y < rect.y + rect.h
  )
}

export type CuboidHit = {
  cuboidName: string
  face: CuboidFace
  rect: Rect
}

export const CUBOIDS_CLASSIC: [string, Cuboid][] = [
  ["head", HEAD],
  ["hat", HAT],
  ["body", BODY],
  ["jacket", JACKET],
  ["rightArm", RIGHT_ARM],
  ["rightSleeve", RIGHT_SLEEVE],
  ["leftArm", LEFT_ARM],
  ["leftSleeve", LEFT_SLEEVE],
  ["rightLeg", RIGHT_LEG],
  ["rightPant", RIGHT_PANT],
  ["leftLeg", LEFT_LEG],
  ["leftPant", LEFT_PANT],
]

export const CUBOIDS_SLIM: [string, Cuboid][] = [
  ["head", HEAD],
  ["hat", HAT],
  ["body", BODY],
  ["jacket", JACKET],
  ["rightArm", SLIM_RIGHT_ARM],
  ["rightSleeve", SLIM_RIGHT_SLEEVE],
  ["leftArm", SLIM_LEFT_ARM],
  ["leftSleeve", SLIM_LEFT_SLEEVE],
  ["rightLeg", RIGHT_LEG],
  ["rightPant", RIGHT_PANT],
  ["leftLeg", LEFT_LEG],
  ["leftPant", LEFT_PANT],
]

export type CuboidAtTexel = {
  cuboidName: string
  cuboid: Cuboid
}

export function findCuboidAtTexel(p: Point, slim = false): CuboidAtTexel | null {
  const list = slim ? CUBOIDS_SLIM : CUBOIDS_CLASSIC
  for (const [cuboidName, cuboid] of list) {
    for (const face of CUBOID_FACES) {
      if (isWithinRect(p, cuboid[face])) {
        return { cuboidName, cuboid }
      }
    }
  }
  return null
}

export function findCuboidFaceAtTexel(
  p: Point,
  slim = false,
): CuboidHit | null {
  const hit = findCuboidAtTexel(p, slim)
  if (!hit) return null
  for (const face of CUBOID_FACES) {
    const rect = hit.cuboid[face]
    if (isWithinRect(p, rect)) {
      return { cuboidName: hit.cuboidName, face, rect }
    }
  }
  return null
}

