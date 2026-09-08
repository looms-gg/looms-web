import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { beforeEach, describe, expect, it } from "vitest"
import { CookieConsentProvider, useCookieConsent } from "./cookieConsent"
import { COOKIE_CONSENT_KEY, readCookieConsent } from "../lib/cookieConsent"

function Probe() {
  const c = useCookieConsent()
  return (
    <div>
      <span data-open={c.bannerOpen ? "1" : "0"} />
      <span data-status={c.consent?.status ?? "none"} />
      <button type="button" onClick={c.acceptAll}>
        accept
      </button>
      <button type="button" onClick={c.rejectNonEssential}>
        reject
      </button>
      <button type="button" onClick={c.openSettings}>
        settings
      </button>
    </div>
  )
}

describe("CookieConsentProvider", () => {
  beforeEach(() => localStorage.clear())

  it("opens banner when unset; accept/reject persist; settings clears and reopens", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <CookieConsentProvider>
          <Probe />
        </CookieConsentProvider>,
      )
    })
    expect(host.querySelector("[data-open]")?.getAttribute("data-open")).toBe("1")

    flushSync(() => {
      host.querySelector("button")!.click()
    })
    expect(readCookieConsent()?.status).toBe("accepted")
    expect(host.querySelector("[data-open]")?.getAttribute("data-open")).toBe("0")

    flushSync(() => {
      host.querySelectorAll("button")[2]!.click()
    })
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull()
    expect(host.querySelector("[data-open]")?.getAttribute("data-open")).toBe("1")
  })
})
