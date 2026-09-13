import type { Equipped } from "../data/outfit"
import { DEFAULT_BODY_ID } from "../data/bodies"
import type { SkinModel } from "../data/model"
import type { Look } from "../data/look"

export type { Look, LookVisibility } from "../data/look"

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

/** Fresh Persist copy for WardrobeProvider seed/reset (mutable arrays/objects). */
export function freshPersist(): Persist {
  return {
    ...persistDefaults,
    owned: [],
    equipped: {},
    stack: [],
    looks: [],
  }
}
