import { useEffect, useState } from "react"
import {
  faBullhorn,
  faCircleInfo,
  faTriangleExclamation,
  faWandSparkles,
  faXmark,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../ui/FaIcon"
import type { SiteBannerRow } from "../../lib/supabase"
import {
  dismissBanner,
  fetchActiveSiteBanner,
  isBannerDismissed,
} from "../../lib/siteBanner"

export function SiteBanner() {
  const [banner, setBanner] = useState<SiteBannerRow | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

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
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadBanner()
    return () => {
      mounted = false
    }
  }, [])

  if (loading || !banner || dismissed) {
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
          icon: faWandSparkles,
          iconColor: "text-secondary",
          btnClass: "btn-secondary",
        }
      case "warning":
        return {
          wrapper: "bg-warning/15 text-warning-content border-warning/25",
          icon: faTriangleExclamation,
          iconColor: "text-warning",
          btnClass: "btn-warning",
        }
      case "neutral":
        return {
          wrapper: "bg-base-200 text-base-content border-base-content/10",
          icon: faBullhorn,
          iconColor: "text-base-content/70",
          btnClass: "btn-ghost border border-base-content/20",
        }
      case "info":
      default:
        return {
          wrapper: "bg-primary/10 text-base-content border-primary/25",
          icon: faCircleInfo,
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
            <FaIcon icon={style.icon} className="size-4" />
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
              <FaIcon icon={faArrowRight} className="size-2.5" />
            </a>
          ) : null}
        </div>

        {banner.dismissible ? (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="btn btn-ghost btn-circle btn-xs shrink-0 opacity-60 hover:opacity-100"
          >
            <FaIcon icon={faXmark} className="size-3.5" />
          </button>
        ) : null}
      </div>
    </aside>
  )
}
