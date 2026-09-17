import {
  BODY,
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
import { findCuboidFaceAtTexel, type Point } from "./editorMath"

type LimbPair = {
  rightName: string
  leftName: string
  rightCuboid: Cuboid
  leftCuboid: Cuboid
}

function getLimbPairs(slim: boolean): LimbPair[] {
  return [
    {
      rightName: "rightArm",
      leftName: "leftArm",
      rightCuboid: slim ? SLIM_RIGHT_ARM : RIGHT_ARM,
      leftCuboid: slim ? SLIM_LEFT_ARM : LEFT_ARM,
    },
    {
      rightName: "rightSleeve",
      leftName: "leftSleeve",
      rightCuboid: slim ? SLIM_RIGHT_SLEEVE : RIGHT_SLEEVE,
      leftCuboid: slim ? SLIM_LEFT_SLEEVE : LEFT_SLEEVE,
    },
    {
      rightName: "rightLeg",
      leftName: "leftLeg",
      rightCuboid: RIGHT_LEG,
      leftCuboid: LEFT_LEG,
    },
    {
      rightName: "rightPant",
      leftName: "leftPant",
      rightCuboid: RIGHT_PANT,
      leftCuboid: LEFT_PANT,
    },
  ]
}

function mirrorWithinRect(p: Point, rect: Rect): Point {
  const dx = p.x - rect.x
  const dy = p.y - rect.y
  return {
    x: rect.x + (rect.w - 1 - dx),
    y: rect.y + dy,
  }
}

function mapAcrossFaces(
  p: Point,
  fromRect: Rect,
  toRect: Rect,
  flipX = true,
): Point {
  const dx = p.x - fromRect.x
  const dy = p.y - fromRect.y
  const targetX = flipX ? toRect.w - 1 - dx : dx
  return {
    x: toRect.x + targetX,
    y: toRect.y + dy,
  }
}

export function getMirroredTexel(p: Point, slim = false): Point | null {
  const hit = findCuboidFaceAtTexel(p, slim)
  if (!hit) return null

  const { cuboidName, face } = hit

  // 1. Axial cuboids: Head, Hat, Body, Jacket
  if (cuboidName === "head" || cuboidName === "hat") {
    const cuboid = cuboidName === "head" ? HEAD : HAT
    if (face === "front" || face === "back" || face === "top" || face === "bottom") {
      return mirrorWithinRect(p, cuboid[face])
    }
    if (face === "right") {
      return mapAcrossFaces(p, cuboid.right, cuboid.left, true)
    }
    if (face === "left") {
      return mapAcrossFaces(p, cuboid.left, cuboid.right, true)
    }
  }

  if (cuboidName === "body" || cuboidName === "jacket") {
    const cuboid = cuboidName === "body" ? BODY : JACKET
    if (face === "front" || face === "back" || face === "top" || face === "bottom") {
      return mirrorWithinRect(p, cuboid[face])
    }
    if (face === "right") {
      return mapAcrossFaces(p, cuboid.right, cuboid.left, true)
    }
    if (face === "left") {
      return mapAcrossFaces(p, cuboid.left, cuboid.right, true)
    }
  }

  // 2. Limb Pairs: Right <-> Left
  const limbPairs = getLimbPairs(slim)
  for (const pair of limbPairs) {
    if (cuboidName === pair.rightName) {
      const targetFace: CuboidFace =
        face === "right" ? "left" : face === "left" ? "right" : face
      return mapAcrossFaces(
        p,
        pair.rightCuboid[face],
        pair.leftCuboid[targetFace],
        true,
      )
    }
    if (cuboidName === pair.leftName) {
      const targetFace: CuboidFace =
        face === "right" ? "left" : face === "left" ? "right" : face
      return mapAcrossFaces(
        p,
        pair.leftCuboid[face],
        pair.rightCuboid[targetFace],
        true,
      )
    }
  }

  return null
}

export function getSymmetricPoints(points: Point[], slim = false): Point[] {
  const set = new Set<string>()
  const result: Point[] = []

  const add = (pt: Point) => {
    const key = `${pt.x},${pt.y}`
    if (!set.has(key)) {
      set.add(key)
      result.push(pt)
    }
  }

  for (const p of points) {
    add(p)
    const mirrored = getMirroredTexel(p, slim)
    if (mirrored) {
      add(mirrored)
    }
  }

  return result
}

