import { useEffect, useState, type FormEvent } from "react"
import {
  Megaphone,
  Check,
  Info,
  FloppyDisk,
  Warning,
  Sparkle,
  ArrowRight,
  X,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS } from "../../lib/sanitize"
import {
  fetchAdminSiteBanner,
  saveSiteBanner,
} from "../../lib/siteBanner"
import type { SiteBannerRow } from "../../lib/supabase"

export function BannerSettings({ adminId }: { adminId: string }) {
  const [banner, setBanner] = useState<SiteBannerRow | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [text, setText] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkLabel, setLinkLabel] = useState("")
  const [style, setStyle] = useState<"info" | "accent" | "warning" | "neutral">("info")
  const [dismissible, setDismissible] = useState(true)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchAdminSiteBanner()
        if (data) {
          setBanner(data)
          setIsActive(data.is_active)
          setText(data.text)
          setLinkUrl(data.link_url ?? "")
          setLinkLabel(data.link_label ?? "")
          setStyle(data.style)
          setDismissible(data.dismissible)
        }
      } catch (err) {
        setError(formatErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) {
      setError("Banner text cannot be empty.")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updated = await saveSiteBanner({
        id: banner?.id,
        isActive,
        text,
        linkUrl: linkUrl.trim() || null,
        linkLabel: linkLabel.trim() || null,
        style,
        dismissible,
        adminId,
      })
      setBanner(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const getPreviewClasses = () => {
    switch (style) {
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

  const preview = getPreviewClasses()

  if (loading) {
    return (
      <div className="py-16 text-center">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Live Preview */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-base-content/60">
          Live Preview
        </label>
        <div className="overflow-hidden rounded-2xl border border-base-content/15 bg-base-300/30 p-1 shadow-sm">
          <aside
            className={`w-full rounded-xl border px-4 py-2.5 transition-colors duration-200 ${preview.wrapper}`}
          >
            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
              <div className="flex flex-1 items-center justify-center gap-2 text-center md:gap-3">
                <span className={`shrink-0 ${preview.iconColor}`}>
                  <Icon icon={preview.icon} className="size-4" />
                </span>
                <span className="leading-snug">{text.trim() || "Your announcement text will show here."}</span>
                {linkUrl.trim() ? (
                  <span
                    className={`btn btn-xs rounded-full font-extrabold gap-1 shrink-0 ${preview.btnClass}`}
                  >
                    {linkLabel.trim() || "Learn more"}
                    <Icon icon={ArrowRight} className="size-2.5" />
                  </span>
                ) : null}
              </div>

              {dismissible ? (
                <span className="opacity-40">
                  <Icon icon={X} className="size-3.5" />
                </span>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Active Toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-base-content/10 bg-base-200/50 p-4 transition-colors hover:border-base-content/20 hover:bg-base-200/80 shadow-sm">
          <div>
            <h4 className="text-sm font-black text-base-content">Site Announcement Active</h4>
            <p className="text-xs text-base-content/60 text-pretty">
              When enabled, this banner is displayed across the top of all pages.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="toggle toggle-primary"
            aria-label="Toggle active banner"
          />
        </div>

        {/* Text Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-base-content/60">
            <label htmlFor="banner-text">Banner Message Text</label>
            <span className="text-xs tabular-nums font-mono text-base-content/40">
              {text.length} / {MAX_LIMITS.SITE_BANNER_TEXT}
            </span>
          </div>
          <textarea
            id="banner-text"
            rows={2}
            className="textarea textarea-bordered w-full font-medium focus:outline-none focus:border-primary"
            placeholder="e.g. 🚀 Welcome to looms! Try out the new 3D Studio layers."
            maxLength={MAX_LIMITS.SITE_BANNER_TEXT}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-base-content/60">
            Color Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(
              [
                { id: "info", label: "Info", color: "bg-primary" },
                { id: "accent", label: "Accent", color: "bg-secondary" },
                { id: "warning", label: "Warning", color: "bg-warning" },
                { id: "neutral", label: "Neutral", color: "bg-base-content/40" },
              ] as const
            ).map((s) => {
              const selected = style === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 font-extrabold capitalize transition-colors active:scale-[0.96] transition-transform ${
                    selected
                      ? "border-primary bg-primary/15 text-primary shadow-sm"
                      : "border-base-content/10 bg-base-200/50 hover:bg-base-200/80 text-base-content/70"
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${s.color}`} />
                  <span className="text-xs">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Optional Link & Label */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="banner-link-url" className="text-xs font-black uppercase tracking-wider text-base-content/60">
              Link URL (Optional)
            </label>
            <input
              id="banner-link-url"
              type="text"
              className="input input-bordered w-full text-sm font-medium focus:outline-none focus:border-primary"
              placeholder="https://... or /studio"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="banner-link-label" className="text-xs font-black uppercase tracking-wider text-base-content/60">
              Button Label
            </label>
            <input
              id="banner-link-label"
              type="text"
              maxLength={MAX_LIMITS.SITE_BANNER_LINK_LABEL}
              className="input input-bordered w-full text-sm font-medium focus:outline-none focus:border-primary"
              placeholder="e.g. Check it out"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
            />
          </div>
        </div>

        {/* Dismissible Toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-base-content/10 bg-base-200/50 p-4 transition-colors hover:border-base-content/20 hover:bg-base-200/80 shadow-sm">
          <div>
            <h4 className="text-sm font-black text-base-content">Dismissible by Users</h4>
            <p className="text-xs text-base-content/60 text-pretty">
              Allows users to click 'x' to dismiss this announcement on their device.
            </p>
          </div>
          <input
            type="checkbox"
            checked={dismissible}
            onChange={(e) => setDismissible(e.target.checked)}
            className="toggle toggle-primary"
            aria-label="Toggle dismissible"
          />
        </div>

        {error ? (
          <div className="alert alert-error text-sm font-bold" role="alert">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="alert alert-success text-sm font-bold text-success-content flex items-center gap-2" role="alert">
            <Icon icon={Check} className="size-4" />
            Announcement banner settings saved successfully!
          </div>
        ) : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary min-h-11 rounded-full font-black px-6 gap-2 shadow-sm transition-colors active:scale-[0.96] transition-transform"
          >
            <Icon icon={FloppyDisk} className={`size-3.5 ${saving ? "animate-spin" : ""}`} />
            {saving ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </form>
    </div>
  )
}
