import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it } from "vitest"
import { CookieConsentProvider } from "../../state/cookieConsent"
import { CookieBanner } from "./CookieBanner"

describe("CookieBanner", () => {
  beforeEach(() => localStorage.clear())

  it("renders Accept all and Reject non-essential with policy link", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <CookieConsentProvider>
            <CookieBanner />
          </CookieConsentProvider>
        </MemoryRouter>,
      )
    })
    expect(host.textContent).toMatch(/Accept all/i)
    expect(host.textContent).toMatch(/Reject non-essential/i)
    expect(host.querySelector('a[href="/cookies"]')).not.toBeNull()
  })
})
