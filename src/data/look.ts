import type { Equipped } from "./outfit"
import type { SkinModel } from "./model"

export type LookVisibility = "private" | "public"

/**
 * A saved outfit as it persists locally and in the database. Lives in the
 * data layer so lib- and skin-layer consumers can reference it without
 * importing upward into state; state/persist re-exports it.
 */
export type Look = {
  id: string
  name: string
  equipped: Equipped
  stack: string[]
  bodyId: string
  bodyHue: number
  model: SkinModel
  savedAt: number
  description: string
  visibility: LookVisibility
}
