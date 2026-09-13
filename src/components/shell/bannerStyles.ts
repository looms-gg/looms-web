import { Info, Megaphone, Star, Warning } from "@phosphor-icons/react"
import type { IconType } from "../ui/Icon"
import type { BannerStyle } from "../../lib/supabase"

export type { BannerStyle }

export type BannerStyleClasses = {
  wrapper: string
  icon: IconType
  iconColor: string
  btnClass: string
}

// Single source of truth for banner visual styles: the live SiteBanner and
// the admin preview (BannerSettings) both render from this table so a style
// tweak lands in both places at once.
export const BANNER_STYLE_CLASSES: Record<BannerStyle, BannerStyleClasses> = {
  accent: {
    wrapper: "bg-secondary/15 text-secondary-content border-secondary/25",
    icon: Star,
    iconColor: "text-secondary",
    btnClass: "btn-secondary",
  },
  warning: {
    wrapper: "bg-warning/15 text-warning-content border-warning/25",
    icon: Warning,
    iconColor: "text-warning",
    btnClass: "btn-warning",
  },
  neutral: {
    wrapper: "bg-base-200 text-base-content border-base-content/10",
    icon: Megaphone,
    iconColor: "text-base-content/70",
    btnClass: "btn-ghost border border-base-content/20",
  },
  info: {
    wrapper: "bg-primary/10 text-base-content border-primary/25",
    icon: Info,
    iconColor: "text-primary",
    btnClass: "btn-primary",
  },
}

export function bannerStyleClasses(style: string | null | undefined): BannerStyleClasses {
  return BANNER_STYLE_CLASSES[(style ?? "info") as BannerStyle] ?? BANNER_STYLE_CLASSES.info
}
