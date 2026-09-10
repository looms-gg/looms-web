import body1 from "../assets/skins/bodies/body-1.png"
import body2 from "../assets/skins/bodies/body-2.png"
import body3 from "../assets/skins/bodies/body-3.png"
import body4 from "../assets/skins/bodies/body-4.png"
import body5 from "../assets/skins/bodies/body-5.png"
import body6 from "../assets/skins/bodies/body-6.png"
import body7 from "../assets/skins/bodies/body-7.png"
import body8 from "../assets/skins/bodies/body-8.png"

export type Body = {
  id: string
  name: string
  skin: string
  swatch: string
}

export const bodies: Body[] = [
  { id: "body-1", name: "Fair", skin: body1, swatch: "#f5bda3" },
  { id: "body-2", name: "Light", skin: body2, swatch: "#f1b98d" },
  { id: "body-3", name: "Warm", skin: body3, swatch: "#cb9876" },
  { id: "body-4", name: "Tan", skin: body4, swatch: "#9d6b4c" },
  { id: "body-5", name: "Medium", skin: body5, swatch: "#86553f" },
  { id: "body-6", name: "Deep", skin: body6, swatch: "#684434" },
  { id: "body-7", name: "Dark", skin: body7, swatch: "#4c3123" },
  { id: "body-8", name: "Deepest", skin: body8, swatch: "#442e25" },
]

export const DEFAULT_BODY_ID = "body-3"

const bodyById = new Map(bodies.map((body) => [body.id, body]))

export function getBody(id: string | undefined | null) {
  if (!id) return undefined
  return bodyById.get(id)
}

export function bodyOrDefault(id: string | undefined | null) {
  return getBody(id) ?? bodyById.get(DEFAULT_BODY_ID)!
}
