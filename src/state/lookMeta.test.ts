import { describe, expect, it } from "vitest"
import {
  applyLookMeta,
  asLookDescription,
  asLookVisibility,
  committedLookName,
} from "./lookMeta"

const base = {
  id: "look-1",
  name: "Rain day",
  equipped: { hair: "ash-crop" },
  savedAt: 1,
  description: "Old blurb",
  visibility: "private" as const,
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
})
