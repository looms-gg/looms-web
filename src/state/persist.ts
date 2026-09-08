import type { Equipped } from "../data/outfit"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { HUE_MAX, HUE_MIN } from "../skin/hue"
import type { SkinModel } from "../skin/convert"

export type LookVisibility = "private" | "public"

export type Look = {
  id: string
  name: string
  equipped: Equipped
  stack?: string[]
  bodyId?: string
  bodyHue?: number
  model?: SkinModel
  savedAt: number
  description: string
  visibility: LookVisibility
}

export type Persist = {
  owned: string[]
  equipped: Equipped
  stack: string[]
  bodyId: string
  bodyHue: number
  model: SkinModel
  looks: Look[]
  player: string | null
  activeLookId?: string | null
}

export const persistDefaults: Persist = {
  owned: [],
  equipped: {},
  stack: [],
  bodyId: DEFAULT_BODY_ID,
  bodyHue: 0,
  model: "classic",
  looks: [],
  player: null,
  activeLookId: null,
}

export function clampHue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(HUE_MIN, Math.min(HUE_MAX, Math.round(value)))
}
