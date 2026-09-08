import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { LegalDocument } from "./LegalDocument"

describe("LegalDocument", () => {
  it("renders centered privacy title and TBD contact placeholder", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <LegalDocument docId="privacy" />
        </MemoryRouter>,
      )
    })
    expect(host.querySelector("h1")?.textContent).toMatch(/Privacy Policy/i)
    expect(host.textContent).toMatch(/privacy@\[TBD\]/)
    expect(host.textContent).toMatch(/ser0th/)
    expect(host.querySelector("article")?.className).toMatch(/max-w-prose/)
  })

  it("mentions free wardrobe add and no paid unlocks on terms", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <LegalDocument docId="terms" />
        </MemoryRouter>,
      )
    })
    expect(host.textContent).toMatch(/free/i)
    expect(host.textContent).not.toMatch(/\bgems\b/i)
  })
})
