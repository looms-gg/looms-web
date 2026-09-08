import { describe, expect, it } from "vitest"
import { LEGAL_DOCS, type LegalDocId } from "./content"

const IDS: LegalDocId[] = ["privacy", "terms", "cookies", "guidelines"]

describe("LEGAL_DOCS", () => {
  it("covers every legal doc id with matching id and non-empty sections", () => {
    for (const id of IDS) {
      const doc = LEGAL_DOCS[id]
      expect(doc.id).toBe(id)
      expect(doc.title.length).toBeGreaterThan(0)
      expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(doc.sections.length).toBeGreaterThan(0)
      for (const section of doc.sections) {
        expect(section.heading.length).toBeGreaterThan(0)
        expect(section.paragraphs.length).toBeGreaterThan(0)
      }
    }
  })

  it("keeps a privacy contact placeholder and discord link in privacy + guidelines", () => {
    expect(LEGAL_DOCS.privacy.sections.some((s) => s.paragraphs.some((p) => p.includes("privacy@[TBD]")))).toBe(
      true,
    )
    expect(
      LEGAL_DOCS.guidelines.sections.some((s) =>
        s.paragraphs.some((p) => p.includes("discord.gg")),
      ),
    ).toBe(true)
  })

  it("describes free wardrobe usage without paid unlock language in terms", () => {
    const termsText = LEGAL_DOCS.terms.sections.flatMap((s) => s.paragraphs).join("\n")
    expect(termsText).toMatch(/free/i)
    expect(termsText).not.toMatch(/\bgems\b/i)
  })
})
