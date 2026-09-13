import { MAX_LIMITS, sanitizeText, sanitizeUrl } from "./sanitize"
import { supabase, type BannerStyle, type SiteBannerRow } from "./supabase"

const DISMISSED_BANNER_STORAGE_KEY = "looms_dismissed_site_banner"
const LAST_BANNER_STORAGE_KEY = "looms_last_site_banner"

const VALID_STYLES = new Set(["info", "accent", "warning", "neutral"])

function isSiteBannerRow(val: unknown): val is SiteBannerRow {
  if (!val || typeof val !== "object") return false
  const r = val as Record<string, unknown>
  return (
    typeof r.id === "string" &&
    typeof r.is_active === "boolean" &&
    typeof r.text === "string" &&
    (r.link_url === null || typeof r.link_url === "string") &&
    (r.link_label === null || typeof r.link_label === "string") &&
    typeof r.style === "string" &&
    VALID_STYLES.has(r.style) &&
    typeof r.dismissible === "boolean" &&
    typeof r.created_at === "string" &&
    typeof r.updated_at === "string" &&
    (r.updated_by === null || typeof r.updated_by === "string")
  )
}

/**
 * Returns the last banner seen by this browser (from localStorage), or null.
 * Lets the SiteBanner render synchronously on mount so the page never shifts
 * when the fetch resolves.
 */
export function getCachedActiveBanner(): SiteBannerRow | null {
  try {
    const stored = localStorage.getItem(LAST_BANNER_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as unknown
    return isSiteBannerRow(parsed) ? parsed : null
  } catch {
    return null
  }
}

function setCachedActiveBanner(banner: SiteBannerRow | null) {
  try {
    if (banner) {
      localStorage.setItem(LAST_BANNER_STORAGE_KEY, JSON.stringify(banner))
    } else {
      localStorage.removeItem(LAST_BANNER_STORAGE_KEY)
    }
  } catch {
    // localStorage quota or private mode fallback
  }
}

/**
 * Fetches the currently active site announcement banner for public display.
 * Never throws: null also covers fetch failure so the page renders bannerless;
 * a broken fetch must not block the page shell. Admin edits use
 * fetchAdminSiteBanner, which throws so the admin editor surfaces the error.
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
  setCachedActiveBanner(data)
  return data
}

/**
 * Fetches the latest site banner config (active or inactive) for admin
 * management. Throws on failure — the admin editor surfaces the error, unlike
 * the display path in fetchActiveSiteBanner which swallows to null.
 */
export async function fetchAdminSiteBanner(): Promise<SiteBannerRow | null> {
  const { data, error } = await supabase
    .from("site_banners")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export type SaveSiteBannerInput = {
  id?: string
  isActive: boolean
  text: string
  linkUrl?: string | null
  linkLabel?: string | null
  style: BannerStyle
  dismissible: boolean
}

/**
 * Creates or updates the site announcement banner via the admin_save_banner
 * SECURITY DEFINER RPC, which sets updated_by from the server session and
 * writes the audit row in the same transaction.
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

  const { data, error } = await supabase.rpc("admin_save_banner", {
    p_id: input.id ?? null,
    p_is_active: input.isActive,
    p_text: cleanText,
    p_link_url: cleanUrl,
    p_link_label: cleanLabel,
    p_style: input.style,
    p_dismissible: input.dismissible,
  })

  if (error) throw error
  return data as SiteBannerRow
}

type DismissedBannerRecord = {
  bannerId: string
  dismissedAt: string
}

function isDismissedBannerRecord(val: unknown): val is DismissedBannerRecord {
  if (!val || typeof val !== "object") return false
  const r = val as Record<string, unknown>
  return typeof r.bannerId === "string" && typeof r.dismissedAt === "string"
}

/**
 * Checks if this banner (by ID and updated_at) was dismissed by the user in this browser.
 */
export function isBannerDismissed(bannerId: string, updatedAt: string): boolean {
  try {
    const stored = localStorage.getItem(DISMISSED_BANNER_STORAGE_KEY)
    if (!stored) return false
    const parsed = JSON.parse(stored) as unknown
    if (!isDismissedBannerRecord(parsed)) return false
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
