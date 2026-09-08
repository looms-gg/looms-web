import { Link } from "react-router-dom"
import { LoomsLogo } from "./LoomsLogo"
import { useCookieConsent } from "../state/cookieConsent"

const DISCORD_URL = "https://discord.gg/k4DcnznKzd"

const legalLinks = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
  { to: "/guidelines", label: "Community Guidelines" },
] as const

export function SiteFooter() {
  const { openSettings } = useCookieConsent()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-base-content/10 bg-base-100">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-10 lg:px-12">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link to="/" className="rounded-lg outline-offset-4" aria-label="looms home">
            <LoomsLogo decorative variant="wordmark" className="h-7" />
          </Link>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm min-h-11 rounded-full font-bold border border-base-content/15"
            title="Join looms on Discord"
          >
            Discord
          </a>
        </div>

        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start"
        >
          {legalLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-bold text-base-content/70 hover:text-primary truncate max-w-[16rem]"
              title={link.label}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="text-sm font-bold text-base-content/70 hover:text-primary min-h-11"
            onClick={openSettings}
          >
            Cookie settings
          </button>
        </nav>

        <p className="text-center sm:text-left text-xs text-base-content/50">
          © {year} ser0th · Free to style, export, and wear. Unofficial Minecraft fan project.
        </p>
      </div>
    </footer>
  )
}
