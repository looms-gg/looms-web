export const COOKIE_CONSENT_KEY = "looms.cookie-consent"

export type CookieConsentStatus = "accepted" | "rejected"

export type CookieConsent = {
  status: CookieConsentStatus
  updatedAt: string
}

function isStatus(value: unknown): value is CookieConsentStatus {
  return value === "accepted" || value === "rejected"
}

export function readCookieConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as Record<string, unknown>
    if (!isStatus(record.status) || typeof record.updatedAt !== "string") return null
    return { status: record.status, updatedAt: record.updatedAt }
  } catch {
    return null
  }
}

export function writeCookieConsent(status: CookieConsentStatus): CookieConsent {
  const next: CookieConsent = { status, updatedAt: new Date().toISOString() }
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next))
  return next
}

export function clearCookieConsent(): void {
  localStorage.removeItem(COOKIE_CONSENT_KEY)
}

export function hasNonEssentialConsent(consent?: CookieConsent | null): boolean {
  const value = consent === undefined ? readCookieConsent() : consent
  return value?.status === "accepted"
}
