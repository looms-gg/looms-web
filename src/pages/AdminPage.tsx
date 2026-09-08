import { useState } from "react"
import {
  faBullhorn,
  faClockRotateLeft,
  faFlag,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../components/ui/FaIcon"
import { HeadMeta } from "../components/shell/HeadMeta"
import { useAuth } from "../state/auth"
import { ModerationQueue } from "./admin/ModerationQueue"
import { LatestActivityFeed } from "./admin/LatestActivityFeed"
import { BannerSettings } from "./admin/BannerSettings"

type AdminTab = "moderation" | "activity" | "banner"

export function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<AdminTab>("moderation")

  const tabs: { id: AdminTab; label: string; icon: typeof faFlag }[] = [
    { id: "moderation", label: "Moderation Queue", icon: faFlag },
    { id: "activity", label: "Latest Activity", icon: faClockRotateLeft },
    { id: "banner", label: "Site Banner", icon: faBullhorn },
  ]

  return (
    <div className="space-y-8">
      <HeadMeta
        title="Admin Panel · looms"
        description="Looms administrator control panel and content moderation."
      />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-content/10 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="grid size-12 place-items-center rounded-2xl bg-warning/15 text-warning">
            <FaIcon icon={faShieldHalved} className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-balance">Admin Panel</h1>
              <span className="badge badge-warning badge-sm font-black uppercase tracking-wider text-xs">
                Admin
              </span>
            </div>
            <p className="text-xs font-semibold text-base-content/60 text-pretty">
              Moderation queue, real-time activity feed, and announcement banner management
            </p>
          </div>
        </div>

        {user ? (
          <div className="rounded-xl border border-base-content/10 bg-base-200/50 px-3.5 py-2 text-right shadow-sm">
            <span className="text-xs font-extrabold uppercase tracking-wider text-base-content/40 block">
              Signed in Administrator
            </span>
            <span className="font-mono text-xs font-bold text-base-content/70 tabular-nums">
              {user.id}
            </span>
          </div>
        ) : null}
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-base-content/10 pb-3" role="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={tab.label}
              onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm rounded-full font-extrabold gap-2 transition-colors active:scale-[0.96] transition-transform ${
                active
                  ? "btn-primary shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
            >
              <FaIcon icon={tab.icon} className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "moderation" && user ? (
          <ModerationQueue adminId={user.id} />
        ) : null}
        {activeTab === "activity" ? <LatestActivityFeed /> : null}
        {activeTab === "banner" && user ? (
          <BannerSettings adminId={user.id} />
        ) : null}
      </div>
    </div>
  )
}
