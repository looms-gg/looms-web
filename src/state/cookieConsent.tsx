import { createContext, useContext, useState, type ReactNode } from "react"
import {
  clearCookieConsent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsent,
} from "../lib/cookieConsent"

type CookieConsentContextValue = {
  consent: CookieConsent | null
  bannerOpen: boolean
  acceptAll: () => void
  rejectNonEssential: () => void
  openSettings: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(() => readCookieConsent())
  const [bannerOpen, setBannerOpen] = useState(() => readCookieConsent() == null)

  const acceptAll = () => {
    setConsent(writeCookieConsent("accepted"))
    setBannerOpen(false)
  }

  const rejectNonEssential = () => {
    setConsent(writeCookieConsent("rejected"))
    setBannerOpen(false)
  }

  const openSettings = () => {
    clearCookieConsent()
    setConsent(null)
    setBannerOpen(true)
  }

  return (
    <CookieConsentContext
      value={{ consent, bannerOpen, acceptAll, rejectNonEssential, openSettings }}
    >
      {children}
    </CookieConsentContext>
  )
}

export function useCookieConsent() {
  const value = useContext(CookieConsentContext)
  if (!value) throw new Error("useCookieConsent must be used within CookieConsentProvider")
  return value
}
