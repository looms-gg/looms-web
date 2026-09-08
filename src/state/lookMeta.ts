import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"

export type LookVisibility = "private" | "public"

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
