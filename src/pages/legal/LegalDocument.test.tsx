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
    expect(host.textContent).toMatch(/privacy@looms\.gg/)
    expect(host.textContent).toMatch(/PyreDev/)
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

  it("renders the AI Policy with a link to it in the legal nav", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <LegalDocument docId="ai" />
        </MemoryRouter>,
      )
    })
    expect(host.querySelector("h1")?.textContent).toMatch(/AI Policy/i)
    expect(host.textContent).toMatch(/human-centric platform for creators/i)
    expect(host.querySelector('a[href="/ai"]')).not.toBeNull()
  })
})
