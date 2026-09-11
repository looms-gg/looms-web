import { useEffect, useState } from "react"
import {
  Megaphone,
  Info,
  Warning,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import type { SiteBannerRow } from "../../lib/supabase"
import {
  dismissBanner,
  fetchActiveSiteBanner,
  getCachedActiveBanner,
  isBannerDismissed,
} from "../../lib/siteBanner"

export function SiteBanner() {
  // Seed from the last banner this browser saw so the first paint already
  // includes the banner bar — the fetch resolving can't shift the page. The
  // dismissed check runs synchronously too, so a dismissed banner never
  // flashes back before the fetch confirms it.
  const [banner, setBanner] = useState<SiteBannerRow | null>(() => {
    const cached = getCachedActiveBanner()
    if (!cached || isBannerDismissed(cached.id, cached.updated_at)) return null
    return cached
  })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadBanner() {
      try {
        const active = await fetchActiveSiteBanner()
        if (!mounted) return
        if (active && !isBannerDismissed(active.id, active.updated_at)) {
          setBanner(active)
        } else {
          setBanner(null)
        }
      } catch (err) {
        console.error("Error loading site banner:", err)
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

  const getStyleClasses = () => {
    switch (banner.style) {
      case "accent":
        return {
          wrapper: "bg-secondary/15 text-secondary-content border-secondary/25",
          icon: Sparkle,
          iconColor: "text-secondary",
          btnClass: "btn-secondary",
        }
      case "warning":
        return {
          wrapper: "bg-warning/15 text-warning-content border-warning/25",
          icon: Warning,
          iconColor: "text-warning",
          btnClass: "btn-warning",
        }
      case "neutral":
        return {
          wrapper: "bg-base-200 text-base-content border-base-content/10",
          icon: Megaphone,
          iconColor: "text-base-content/70",
          btnClass: "btn-ghost border border-base-content/20",
        }
      case "info":
      default:
        return {
          wrapper: "bg-primary/10 text-base-content border-primary/25",
          icon: Info,
          iconColor: "text-primary",
          btnClass: "btn-primary",
        }
    }
  }

  const style = getStyleClasses()

  return (
    <aside
      role="region"
      aria-label="Site announcement"
      className={`relative z-30 w-full border-b backdrop-blur-md px-4 py-2.5 transition-all duration-200 ${style.wrapper}`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
        <div className="flex flex-1 items-center justify-center gap-2 text-center md:gap-3">
          <span className={`shrink-0 ${style.iconColor}`}>
            <Icon icon={style.icon} size="md" />
          </span>
          <span className="leading-snug text-pretty">{banner.text}</span>
          {banner.link_url ? (
            <a
              href={banner.link_url}
              target={banner.link_url.startsWith("http") ? "_blank" : undefined}
              rel={banner.link_url.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`btn btn-xs rounded-full font-extrabold gap-1 shrink-0 ${style.btnClass}`}
            >
              {banner.link_label || "Learn more"}
              <Icon icon={ArrowRight} size="xs" />
            </a>
          ) : null}
        </div>

        {banner.dismissible ? (
          <CloseButton onClick={handleDismiss} label="Dismiss banner" size="size-3.5" className="shrink-0 opacity-60 hover:opacity-100" />
        ) : null}
      </div>
    </aside>
  )
}
