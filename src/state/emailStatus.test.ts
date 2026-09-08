import { describe, expect, it } from "vitest"
import { isEmailVerified, isUnconfirmedAuthError } from "./emailStatus"

describe("email status helpers", () => {
  it("treats a missing email as verified and a null confirm stamp as pending", () => {
    expect(isEmailVerified(null)).toBe(false)
    expect(isEmailVerified({ email: null, email_confirmed_at: null })).toBe(true)
    expect(isEmailVerified({ email: "a@b.c", email_confirmed_at: null })).toBe(false)
    expect(isEmailVerified({ email: "a@b.c", email_confirmed_at: "2026-01-01" })).toBe(true)
  })

  it("detects the unconfirmed sign-in error from GoTrue", () => {
    expect(isUnconfirmedAuthError("Email not confirmed")).toBe(true)
    expect(isUnconfirmedAuthError("Invalid login credentials")).toBe(false)
  })
})
