import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { equippedFromStack } from "../data/outfit"
import { bodyOrDefault } from "../data/bodies"
import type { LookRow } from "../lib/supabase"
import { clampHue, type Look, type LookVisibility } from "./persist"

export type { LookVisibility }

export type LookMetaPatch = {
  name?: string
  description?: string
  visibility?: LookVisibility
}

export function asLookVisibility(value: unknown): LookVisibility {
  return value === "public" ? "public" : "private"
}

export function asLookDescription(value: unknown): string {
  if (typeof value !== "string") return ""
  return sanitizeText(value, MAX_LIMITS.LOOK_DESCRIPTION, { multiline: true })
}

export function lookRowToLook(row: LookRow): Look {
  const stack = Array.isArray(row.stack) ? row.stack : []
  return {
    id: row.id,
    name: row.name,
    stack,
    equipped: equippedFromStack(stack),
    bodyId: bodyOrDefault(row.body_id).id,
    bodyHue: clampHue(row.body_hue),
    model: row.model === "slim" ? "slim" : "classic",
    savedAt: new Date(row.created_at).getTime(),
    description: asLookDescription(row.description),
    visibility: asLookVisibility(row.visibility),
  }
}

export function lookPersistFields(look: Look) {
  return {
    name: look.name,
    description: look.description,
    visibility: look.visibility,
    stack: look.stack,
    body_id: look.bodyId,
    body_hue: look.bodyHue,
    model: look.model,
  }
}

export function committedLookName(current: string, draft: string): string {
  const clean = sanitizeText(draft, MAX_LIMITS.LOOK_NAME)
  return clean.length > 0 ? clean : current
}

export function applyLookMeta<
  T extends { name: string; description: string; visibility: LookVisibility },
>(look: T, patch: LookMetaPatch): T {
  return {
    ...look,
    name:
      patch.name === undefined
        ? look.name
        : committedLookName(look.name, patch.name),
    description:
      patch.description === undefined
        ? look.description
        : sanitizeText(patch.description, MAX_LIMITS.LOOK_DESCRIPTION, { multiline: true }),
    visibility:
      patch.visibility === undefined ? look.visibility : patch.visibility,
  }
}
