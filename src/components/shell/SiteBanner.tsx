import { useEffect, useState } from "react"
import { ArrowRight } from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import { bannerStyleClasses } from "./bannerStyles"
import type { SiteBannerRow } from "../../lib/supabase"
import {
  dismissBanner,
  fetchActiveSiteBanner,
  getCachedActiveBanner,
  isBannerDismissed,
} from "../../lib/siteBanner"

function getInitialBanner(): SiteBannerRow | null {
  const cached = getCachedActiveBanner()
  if (!cached || isBannerDismissed(cached.id, cached.updated_at)) return null
  return cached
}

interface BannerActionLinkProps {
  url: string
  label: string | null
  btnClass: string
}

function BannerActionLink({ url, label, btnClass }: BannerActionLinkProps) {
  const isExternal = url.startsWith("http")
  return (
    <a
      href={url}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={`btn btn-xs font-extrabold gap-1 shrink-0 ${btnClass}`}
    >
      {label || "Learn more"}
      <Icon icon={ArrowRight} size="xs" />
    </a>
  )
}

export function SiteBanner() {
  // Seed from the last banner this browser saw so the first paint already
  // includes the banner bar — the fetch resolving can't shift the page. The
  // dismissed check runs synchronously too, so a dismissed banner never
  // flashes back before the fetch confirms it.
  const [banner, setBanner] = useState<SiteBannerRow | null>(getInitialBanner)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadBanner() {
      try {
        const active = await fetchActiveSiteBanner()
        if (!mounted) return
        const isValid = active && !isBannerDismissed(active.id, active.updated_at)
        setBanner(isValid ? active : null)
      } catch (err) {
        console.error("Error loading site banner:", err)
        if (mounted) setBanner(null)
      }
    }

    void loadBanner()
    return () => {
      mounted = false
    }
  }, [])

  if (!banner || dismissed) {
    return null
  }

  const handleDismiss = () => {
    setDismissed(true)
    dismissBanner(banner.id, banner.updated_at)
  }

  const style = bannerStyleClasses(banner.style)

  return (
    <aside
      role="region"
      aria-label="Site announcement"
      className={`site-banner relative z-30 mx-auto mt-2 w-[calc(100%-40px)] max-w-[1344px] rounded-lg border backdrop-blur-md px-4 py-2.5 transition-all duration-200 lg:w-[calc(100%-96px)] ${style.wrapper}`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
        <div className="flex flex-1 items-center justify-center gap-2 text-center md:gap-3">
          <span className={`shrink-0 ${style.iconColor}`}>
            <Icon icon={style.icon} size="md" />
          </span>
          <span className="leading-snug text-pretty">{banner.text}</span>
          {banner.link_url ? (
            <BannerActionLink
              url={banner.link_url}
              label={banner.link_label}
              btnClass={style.btnClass}
            />
          ) : null}
        </div>

        {banner.dismissible ? (
          <CloseButton onClick={handleDismiss} label="Dismiss banner" size="size-3.5" className="relative shrink-0 opacity-60 hover:opacity-100" />
        ) : null}
      </div>
    </aside>
  )
}
