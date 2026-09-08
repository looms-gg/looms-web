import { MAX_LIMITS, sanitizeText, sanitizeUrl } from "./sanitize"
import { supabase, type SiteBannerRow } from "./supabase"

const DISMISSED_BANNER_STORAGE_KEY = "looms_dismissed_site_banner"

/**
 * Fetches the currently active site announcement banner for display.
 */
export async function fetchActiveSiteBanner(): Promise<SiteBannerRow | null> {
  const { data, error } = await supabase
    .from("site_banners")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("Failed to load active site banner:", error)
    return null
  }
  return data as SiteBannerRow | null
}

/**
 * Fetches the latest site banner config (active or inactive) for admin management.
 */
export async function fetchAdminSiteBanner(): Promise<SiteBannerRow | null> {
  const { data, error } = await supabase
    .from("site_banners")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as SiteBannerRow | null
}

export type SaveSiteBannerInput = {
  id?: string
  isActive: boolean
  text: string
  linkUrl?: string | null
  linkLabel?: string | null
  style: "info" | "accent" | "warning" | "neutral"
  dismissible: boolean
  adminId: string
}

/**
 * Creates or updates the site announcement banner.
 */
export async function saveSiteBanner(input: SaveSiteBannerInput): Promise<SiteBannerRow> {
  const cleanText = sanitizeText(input.text, MAX_LIMITS.SITE_BANNER_TEXT)
  if (!cleanText) {
    throw new Error("Banner text cannot be empty.")
  }

  const cleanUrl = input.linkUrl ? sanitizeUrl(input.linkUrl) : null
  const cleanLabel = input.linkLabel
    ? sanitizeText(input.linkLabel, MAX_LIMITS.SITE_BANNER_LINK_LABEL)
    : null

  const payload = {
    is_active: input.isActive,
    text: cleanText,
    link_url: cleanUrl,
    link_label: cleanLabel,
    style: input.style,
    dismissible: input.dismissible,
    updated_at: new Date().toISOString(),
    updated_by: input.adminId,
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("site_banners")
      .update(payload)
      .eq("id", input.id)
      .select()
      .single()

    if (error) throw error
    return data as SiteBannerRow
  }

  const { data, error } = await supabase
    .from("site_banners")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as SiteBannerRow
}

/**
 * Checks if this banner (by ID and updated_at) was dismissed by the user in this browser.
 */
export function isBannerDismissed(bannerId: string, updatedAt: string): boolean {
  try {
    const stored = localStorage.getItem(DISMISSED_BANNER_STORAGE_KEY)
    if (!stored) return false
    const parsed = JSON.parse(stored) as { bannerId: string; dismissedAt: string }
    return parsed.bannerId === bannerId && parsed.dismissedAt >= updatedAt
  } catch {
    return false
  }
}

/**
 * Marks a banner as dismissed in localStorage.
 */
export function dismissBanner(bannerId: string, updatedAt: string): void {
  try {
    localStorage.setItem(
      DISMISSED_BANNER_STORAGE_KEY,
      JSON.stringify({ bannerId, dismissedAt: updatedAt }),
    )
  } catch {
    // localStorage quota or private mode fallback
  }
}
