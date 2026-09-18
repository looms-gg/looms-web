import { Link } from "react-router-dom"
import { DiscordLogo, GithubLogo } from "@phosphor-icons/react"
import { LoomsLogo } from "../ui/LoomsLogo"
import { useCookieConsent } from "../../state/cookieConsent"
import { DISCORD_URL, GITHUB_URL } from "../../lib/content/seo"

const legalLinks = [
  { to: "/blog", label: "Updates" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
  { to: "/guidelines", label: "Community Guidelines" },
  { to: "/ai", label: "AI Policy" },
] as const

const socials = [
  { href: DISCORD_URL, label: "Join looms on Discord", Icon: DiscordLogo },
  { href: GITHUB_URL, label: "View looms on GitHub", Icon: GithubLogo },
] as const

const linkClass =
  "rounded-full px-3 py-2 text-sm font-bold text-base-content/65 transition-colors hover:bg-base-content/5 hover:text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

export function SiteFooter() {
  const { openSettings } = useCookieConsent()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-base-content/10 bg-base-100">
      <div className="mx-auto max-w-[1440px] px-5 py-12 lg:px-12">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:text-left">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <Link to="/" className="rounded-lg outline-offset-4" aria-label="looms home">
              <LoomsLogo decorative variant="wordmark" className="h-7" />
            </Link>
            <p className="max-w-[24ch] text-sm text-base-content/55 lg:max-w-none lg:text-nowrap">
              Free modular wardrobe for Minecraft skins.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 lg:items-end">
            <nav aria-label="Legal" className="-mx-3 flex flex-wrap justify-center gap-x-1 gap-y-1 lg:justify-end">
              {legalLinks.map((link) => (
                <Link key={link.to} to={link.to} className={linkClass}>
                  {link.label}
                </Link>
              ))}
              <button type="button" className={linkClass} onClick={openSettings}>
                Cookie settings
              </button>
            </nav>

            <ul className="flex items-center gap-2">
              {socials.map((social) => (
                <li key={social.href}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    title={social.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-base-content/10 text-base-content/65 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <social.Icon size={18} weight="fill" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-base-content/10 pt-6 text-center lg:text-left">
          <p className="text-xs text-base-content/55">
            © {year} PyreDev · Free to style, export, and wear.
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-base-content/55 lg:mx-0">
            looms is an unofficial Minecraft fan project. Not affiliated with, endorsed by, or
            sponsored by Mojang Studios or Microsoft. Minecraft is a trademark of Mojang Synergies
            AB.
          </p>
        </div>
      </div>
    </footer>
  )
}
