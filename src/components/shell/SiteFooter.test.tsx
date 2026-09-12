import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { CookieConsentProvider } from "../../state/cookieConsent"
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
      'a[href="https://discord.gg/UNTRgHBBPb"]',
    ) as HTMLAnchorElement | null
    expect(discord).not.toBeNull()
    expect(discord?.target).toBe("_blank")
    expect(discord?.rel).toMatch(/noopener/)
    const github = host.querySelector(
      'a[href="https://github.com/looms-gg/looms-web"]',
    ) as HTMLAnchorElement | null
    expect(github).not.toBeNull()
    expect(github?.target).toBe("_blank")
    expect(host.querySelector('a[href="/privacy"]')).not.toBeNull()
    expect(host.querySelector('a[href="/terms"]')).not.toBeNull()
    expect(host.querySelector('a[href="/cookies"]')).not.toBeNull()
    expect(host.querySelector('a[href="/guidelines"]')).not.toBeNull()
    expect(host.textContent).toMatch(/Cookie settings/i)
    expect(host.textContent).toMatch(/PyreDev/)
    expect(host.textContent).toMatch(/not affiliated with, endorsed by, or sponsored by Mojang/i)
    expect(host.textContent).not.toMatch(/\bgems\b/i)
  })
})
