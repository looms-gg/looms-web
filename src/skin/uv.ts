export type Rect = { x: number; y: number; w: number; h: number }

export type Cuboid = {
  top: Rect
  bottom: Rect
  right: Rect
  front: Rect
  left: Rect
  back: Rect
}

export const CUBOID_FACES = [
  "top",
  "bottom",
  "right",
  "front",
  "left",
  "back",
] as const
export type CuboidFace = (typeof CUBOID_FACES)[number]

export const HEAD: Cuboid = {
  top: { x: 8, y: 0, w: 8, h: 8 },
  bottom: { x: 16, y: 0, w: 8, h: 8 },
  right: { x: 0, y: 8, w: 8, h: 8 },
  front: { x: 8, y: 8, w: 8, h: 8 },
  left: { x: 16, y: 8, w: 8, h: 8 },
  back: { x: 24, y: 8, w: 8, h: 8 },
}

export const HAT: Cuboid = {
  top: { x: 40, y: 0, w: 8, h: 8 },
  bottom: { x: 48, y: 0, w: 8, h: 8 },
  right: { x: 32, y: 8, w: 8, h: 8 },
  front: { x: 40, y: 8, w: 8, h: 8 },
  left: { x: 48, y: 8, w: 8, h: 8 },
  back: { x: 56, y: 8, w: 8, h: 8 },
}

export const BODY: Cuboid = {
  top: { x: 20, y: 16, w: 8, h: 4 },
  bottom: { x: 28, y: 16, w: 8, h: 4 },
  right: { x: 16, y: 20, w: 4, h: 12 },
  front: { x: 20, y: 20, w: 8, h: 12 },
  left: { x: 28, y: 20, w: 4, h: 12 },
  back: { x: 32, y: 20, w: 8, h: 12 },
}

export const JACKET: Cuboid = {
  top: { x: 20, y: 32, w: 8, h: 4 },
  bottom: { x: 28, y: 32, w: 8, h: 4 },
  right: { x: 16, y: 36, w: 4, h: 12 },
  front: { x: 20, y: 36, w: 8, h: 12 },
  left: { x: 28, y: 36, w: 4, h: 12 },
  back: { x: 32, y: 36, w: 8, h: 12 },
}

export const RIGHT_ARM: Cuboid = {
  top: { x: 44, y: 16, w: 4, h: 4 },
  bottom: { x: 48, y: 16, w: 4, h: 4 },
  right: { x: 40, y: 20, w: 4, h: 12 },
  front: { x: 44, y: 20, w: 4, h: 12 },
  left: { x: 48, y: 20, w: 4, h: 12 },
  back: { x: 52, y: 20, w: 4, h: 12 },
}

export const SLIM_RIGHT_ARM: Cuboid = {
  top: { x: 44, y: 16, w: 3, h: 4 },
  bottom: { x: 47, y: 16, w: 3, h: 4 },
  right: { x: 40, y: 20, w: 4, h: 12 },
  front: { x: 44, y: 20, w: 3, h: 12 },
  left: { x: 47, y: 20, w: 4, h: 12 },
  back: { x: 51, y: 20, w: 3, h: 12 },
}

export const RIGHT_SLEEVE: Cuboid = {
  top: { x: 44, y: 32, w: 4, h: 4 },
  bottom: { x: 48, y: 32, w: 4, h: 4 },
  right: { x: 40, y: 36, w: 4, h: 12 },
  front: { x: 44, y: 36, w: 4, h: 12 },
  left: { x: 48, y: 36, w: 4, h: 12 },
  back: { x: 52, y: 36, w: 4, h: 12 },
}

export const SLIM_RIGHT_SLEEVE: Cuboid = {
  top: { x: 44, y: 32, w: 3, h: 4 },
  bottom: { x: 47, y: 32, w: 3, h: 4 },
  right: { x: 40, y: 36, w: 4, h: 12 },
  front: { x: 44, y: 36, w: 3, h: 12 },
  left: { x: 47, y: 36, w: 4, h: 12 },
  back: { x: 51, y: 36, w: 3, h: 12 },
}

export const LEFT_ARM: Cuboid = {
  top: { x: 36, y: 48, w: 4, h: 4 },
  bottom: { x: 40, y: 48, w: 4, h: 4 },
  right: { x: 32, y: 52, w: 4, h: 12 },
  front: { x: 36, y: 52, w: 4, h: 12 },
  left: { x: 40, y: 52, w: 4, h: 12 },
  back: { x: 44, y: 52, w: 4, h: 12 },
}

export const SLIM_LEFT_ARM: Cuboid = {
  top: { x: 36, y: 48, w: 3, h: 4 },
  bottom: { x: 39, y: 48, w: 3, h: 4 },
  right: { x: 32, y: 52, w: 4, h: 12 },
  front: { x: 36, y: 52, w: 3, h: 12 },
  left: { x: 39, y: 52, w: 4, h: 12 },
  back: { x: 43, y: 52, w: 3, h: 12 },
}

export const LEFT_SLEEVE: Cuboid = {
  top: { x: 52, y: 48, w: 4, h: 4 },
  bottom: { x: 56, y: 48, w: 4, h: 4 },
  right: { x: 48, y: 52, w: 4, h: 12 },
  front: { x: 52, y: 52, w: 4, h: 12 },
  left: { x: 56, y: 52, w: 4, h: 12 },
  back: { x: 60, y: 52, w: 4, h: 12 },
}

export const SLIM_LEFT_SLEEVE: Cuboid = {
  top: { x: 52, y: 48, w: 3, h: 4 },
  bottom: { x: 55, y: 48, w: 3, h: 4 },
  right: { x: 48, y: 52, w: 4, h: 12 },
  front: { x: 52, y: 52, w: 3, h: 12 },
  left: { x: 55, y: 52, w: 4, h: 12 },
  back: { x: 59, y: 52, w: 3, h: 12 },
}

export const RIGHT_LEG: Cuboid = {
  top: { x: 4, y: 16, w: 4, h: 4 },
  bottom: { x: 8, y: 16, w: 4, h: 4 },
  right: { x: 0, y: 20, w: 4, h: 12 },
  front: { x: 4, y: 20, w: 4, h: 12 },
  left: { x: 8, y: 20, w: 4, h: 12 },
  back: { x: 12, y: 20, w: 4, h: 12 },
}

export const RIGHT_PANT: Cuboid = {
  top: { x: 4, y: 32, w: 4, h: 4 },
  bottom: { x: 8, y: 32, w: 4, h: 4 },
  right: { x: 0, y: 36, w: 4, h: 12 },
  front: { x: 4, y: 36, w: 4, h: 12 },
  left: { x: 8, y: 36, w: 4, h: 12 },
  back: { x: 12, y: 36, w: 4, h: 12 },
}

export const LEFT_LEG: Cuboid = {
  top: { x: 20, y: 48, w: 4, h: 4 },
  bottom: { x: 24, y: 48, w: 4, h: 4 },
  right: { x: 16, y: 52, w: 4, h: 12 },
  front: { x: 20, y: 52, w: 4, h: 12 },
  left: { x: 24, y: 52, w: 4, h: 12 },
  back: { x: 28, y: 52, w: 4, h: 12 },
}

export const LEFT_PANT: Cuboid = {
  top: { x: 4, y: 48, w: 4, h: 4 },
  bottom: { x: 8, y: 48, w: 4, h: 4 },
  right: { x: 0, y: 52, w: 4, h: 12 },
  front: { x: 4, y: 52, w: 4, h: 12 },
  left: { x: 8, y: 52, w: 4, h: 12 },
  back: { x: 12, y: 52, w: 4, h: 12 },
}

export function innerOuterPairs(slim: boolean): [Cuboid, Cuboid][] {
  return [
    [HEAD, HAT],
    [BODY, JACKET],
    [slim ? SLIM_RIGHT_ARM : RIGHT_ARM, slim ? SLIM_RIGHT_SLEEVE : RIGHT_SLEEVE],
    [slim ? SLIM_LEFT_ARM : LEFT_ARM, slim ? SLIM_LEFT_SLEEVE : LEFT_SLEEVE],
    [RIGHT_LEG, RIGHT_PANT],
    [LEFT_LEG, LEFT_PANT],
  ]
}

