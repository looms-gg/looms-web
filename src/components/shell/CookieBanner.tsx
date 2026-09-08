import { Link } from "react-router-dom"
import { useCookieConsent } from "../../state/cookieConsent"

export function CookieBanner() {
  const { bannerOpen, acceptAll, rejectNonEssential } = useCookieConsent()
  if (!bannerOpen) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-[1440px] flex-col gap-4 rounded-[18px] border border-base-content/10 bg-base-300 p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-6">
        <p className="text-sm leading-relaxed text-base-content/80 text-pretty max-w-3xl">
          We use essential cookies for sign-in, theme, and remembering this choice. Non-essential
          cookies load only if you accept.{" "}
          <Link to="/cookies" className="font-bold text-primary underline-offset-2 hover:underline">
            Cookie policy
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-11 rounded-full font-bold border border-base-content/15"
            onClick={rejectNonEssential}
          >
            Reject non-essential
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm min-h-11 rounded-full font-extrabold"
            onClick={acceptAll}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
