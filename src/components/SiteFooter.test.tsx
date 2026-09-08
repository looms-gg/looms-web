import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { CookieConsentProvider } from "../state/cookieConsent"
import { SiteFooter } from "./SiteFooter"

describe("SiteFooter", () => {
  it("links Discord, legal pages, and Cookie settings", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <CookieConsentProvider>
            <SiteFooter />
          </CookieConsentProvider>
        </MemoryRouter>,
      )
    })

    const discord = host.querySelector(
      'a[href="https://discord.gg/k4DcnznKzd"]',
    ) as HTMLAnchorElement | null
    expect(discord).not.toBeNull()
    expect(discord?.target).toBe("_blank")
    expect(discord?.rel).toMatch(/noopener/)
    expect(host.querySelector('a[href="/privacy"]')).not.toBeNull()
    expect(host.querySelector('a[href="/terms"]')).not.toBeNull()
    expect(host.querySelector('a[href="/cookies"]')).not.toBeNull()
    expect(host.querySelector('a[href="/guidelines"]')).not.toBeNull()
    expect(host.textContent).toMatch(/Cookie settings/i)
    expect(host.textContent).toMatch(/ser0th/)
    expect(host.textContent).not.toMatch(/\bgems\b/i)
  })
})
