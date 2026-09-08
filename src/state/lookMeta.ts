import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { equippedFromStack } from "../data/outfit"
import type { LookRow } from "../lib/supabase"
import type { Look, LookVisibility } from "./persist"

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
  return {
    id: row.id,
    name: row.name,
    stack: row.stack,
    equipped: equippedFromStack(row.stack ?? []),
    bodyId: row.body_id,
    bodyHue: row.body_hue,
    model: row.model,
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
    stack: look.stack ?? [],
    body_id: look.bodyId ?? "",
    body_hue: look.bodyHue ?? 0,
    model: look.model ?? ("classic" as const),
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
