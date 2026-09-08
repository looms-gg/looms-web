import { describe, expect, it } from "vitest"
import {
  applyLookMeta,
  asLookDescription,
  asLookVisibility,
  committedLookName,
  lookPersistFields,
  lookRowToLook,
} from "./lookMeta"
import type { LookRow } from "../lib/supabase"

const base = {
  id: "look-1",
  name: "Rain day",
  equipped: { hair: "ash-crop" },
  savedAt: 1,
  description: "Old blurb",
  visibility: "private" as const,
}

const row: LookRow = {
  id: "look-2",
  user_id: "u1",
  name: "Cloud look",
  description: "Soft",
  visibility: "public",
  stack: ["ash-crop"],
  body_id: "body-1",
  body_hue: 12,
  model: "slim",
  created_at: "2026-01-02T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
}

describe("lookMeta", () => {
  it("treats only public as public", () => {
    expect(asLookVisibility("public")).toBe("public")
    expect(asLookVisibility("private")).toBe("private")
    expect(asLookVisibility("nope")).toBe("private")
    expect(asLookVisibility(undefined)).toBe("private")
  })

  it("coerces missing description to empty string", () => {
    expect(asLookDescription(undefined)).toBe("")
    expect(asLookDescription("hello")).toBe("hello")
  })

  it("reverts blank names and keeps a trimmed name", () => {
    expect(committedLookName("Rain day", "   ")).toBe("Rain day")
    expect(committedLookName("Rain day", " Storm ")).toBe("Storm")
  })

  it("patches meta without dropping layers", () => {
    const next = applyLookMeta(base, {
      name: "  ",
      description: "New",
      visibility: "public",
    })
    expect(next.name).toBe("Rain day")
    expect(next.description).toBe("New")
    expect(next.visibility).toBe("public")
    expect(next.equipped).toEqual({ hair: "ash-crop" })
  })

  it("sanitizes HTML and clamps name and description to MAX_LIMITS", () => {
    expect(committedLookName("Rain day", "<script>bad()</script>Fresh Look")).toBe("Fresh Look")
    expect(committedLookName("Rain day", "A".repeat(80)).length).toBe(50)

    const next = applyLookMeta(base, {
      name: "<b>Styling</b>",
      description: "<img src=x onerror=bad()>Awesome vibe",
    })
    expect(next.name).toBe("Styling")
    expect(next.description).toBe("Awesome vibe")
  })

  it("maps LookRow to Look and back to persist fields", () => {
    const look = lookRowToLook(row)
    expect(look.bodyId).toBe("body-1")
    expect(look.bodyHue).toBe(12)
    expect(look.equipped.hair).toBe("ash-crop")
    expect(lookPersistFields(look)).toMatchObject({
      name: "Cloud look",
      body_id: "body-1",
      body_hue: 12,
      model: "slim",
      visibility: "public",
      stack: ["ash-crop"],
    })
  })

  it("defaults missing stack, body, and model at the LookRow boundary", () => {
    const look = lookRowToLook({
      ...row,
      stack: undefined as unknown as string[],
      body_id: undefined as unknown as string,
      body_hue: undefined as unknown as number,
      model: undefined as unknown as LookRow["model"],
    })
    expect(look.stack).toEqual([])
    expect(look.bodyId).toBeTruthy()
    expect(look.bodyHue).toBe(0)
    expect(look.model).toBe("classic")
  })
})
