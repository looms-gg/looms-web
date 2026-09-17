import { beforeEach, describe, expect, it } from "vitest"
import {
  COOKIE_CONSENT_KEY,
  clearCookieConsent,
  hasNonEssentialConsent,
  readCookieConsent,
  writeCookieConsent,
} from "./cookieConsent"

describe("cookieConsent", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns null when unset or invalid", () => {
    expect(readCookieConsent()).toBeNull()
    localStorage.setItem(COOKIE_CONSENT_KEY, "{")
    expect(readCookieConsent()).toBeNull()
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ status: "maybe" }))
    expect(readCookieConsent()).toBeNull()
  })

  it("writes accepted/rejected and clears", () => {
    const accepted = writeCookieConsent("accepted")
    expect(accepted.status).toBe("accepted")
    expect(typeof accepted.updatedAt).toBe("string")
    expect(readCookieConsent()?.status).toBe("accepted")
    expect(hasNonEssentialConsent(accepted)).toBe(true)

    writeCookieConsent("rejected")
    expect(hasNonEssentialConsent(readCookieConsent())).toBe(false)

    clearCookieConsent()
    expect(readCookieConsent()).toBeNull()
    expect(hasNonEssentialConsent(null)).toBe(false)
  })
})
