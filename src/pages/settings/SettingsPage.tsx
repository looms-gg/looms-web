import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  ArrowLeft,
  CloudArrowUp,
  Eye,
  Gear,
  SignIn,
  UserCircle,
} from "@phosphor-icons/react"
import { Icon, type IconType } from "../../components/ui/Icon"
import { HeadMeta } from "../../components/shell/HeadMeta"
import { RequireAuth } from "../../components/auth/RequireAuth"
import { useAuth } from "../../state/auth"
import { isEmailVerified } from "../../state/emailStatus"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  canChangeUsername,
  formatLastSeen,
  resolveAvatarUrl,
  usernameLockMessage,
} from "../../state/profileDisplay"
import { DangerZoneModal } from "../profile/DangerZoneModal"
import { parseSettingsTab, settingsTabQuery, type SettingsTab } from "./settingsTab"
import { ProfileSection } from "./ProfileSection"

const TABS: { id: SettingsTab; label: string; description: string; icon: IconType }[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Your public identity across looms.",
    icon: UserCircle,
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "Control what other people can see on your profile.",
    icon: Eye,
  },
  {
    id: "uploads",
    label: "Uploads",
    description: "Manage your uploaded pieces and looks.",
    icon: CloudArrowUp,
  },
  {
    id: "account",
    label: "Account",
    description: "Email, sign-in, and account deletion.",
    icon: Gear,
  },
]

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[18px] bg-base-200 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-base-content/65">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ToggleRow({
  label,
  hint,
  title,
  checked,
  disabled,
  onToggle,
}: {
  label: string
  hint: string
  title: string
  checked: boolean
  disabled?: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-base-100/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-base-content/60">{hint}</p>
      </div>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        title={title}
        onChange={(event) => onToggle(event.target.checked)}
      />
    </li>
  )
}

function PrivacySection() {
  const { profile, updateProfile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function toggle(patch: { show_last_seen?: boolean; show_likes?: boolean }) {
    setBusy(true)
    setErrorMsg(null)
    const { error } = await updateProfile(patch)
    setBusy(false)
    if (error) setErrorMsg(formatErrorMessage(error))
  }

  return (
    <Section title="Privacy" description="Control what other people can see on your profile.">
      <ul className="space-y-3">
        <ToggleRow
          label="Show last seen"
          hint="Display when you were last active on your profile"
          title="Hides your presence from other people when off"
          checked={Boolean(profile?.show_last_seen)}
          disabled={busy}
          onToggle={(next) => void toggle({ show_last_seen: next })}
        />
        <ToggleRow
          label="Show likes"
          hint="Let others browse the Liked tab on your profile"
          title="Hides the Liked tab from other people when off"
          checked={Boolean(profile?.show_likes)}
          disabled={busy}
          onToggle={(next) => void toggle({ show_likes: next })}
        />
      </ul>
      {errorMsg ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {errorMsg}
        </p>
      ) : null}
    </Section>
  )
}

function UploadsSection() {
  const rowClass =
    "flex items-center justify-between gap-3 rounded-xl bg-base-100/80 px-4 py-3 outline outline-2 outline-transparent transition-[outline-color] duration-150 hover:outline-primary/50 focus-visible:outline-primary"
  return (
    <Section title="Uploads" description="Manage your uploaded pieces and looks.">
      <div className="space-y-3">
        <Link to="/wardrobe?tab=uploads" className={rowClass}>
          <div className="min-w-0">
            <p className="text-sm font-bold">Your pieces</p>
            <p className="text-xs text-base-content/60">
              Rename, describe, or switch pieces between public and private
            </p>
          </div>
          <span className="text-sm font-bold text-base-content/50">→</span>
        </Link>
        <Link to="/wardrobe?tab=looks" className={rowClass}>
          <div className="min-w-0">
            <p className="text-sm font-bold">Your looks</p>
            <p className="text-xs text-base-content/60">
              Edit, export, or change who can see each look
            </p>
          </div>
          <span className="text-sm font-bold text-base-content/50">→</span>
        </Link>
      </div>
    </Section>
  )
}

function AccountSection() {
  const { user, profile, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dangerOpen, setDangerOpen] = useState(false)

  const avatarUrl = resolveAvatarUrl(profile)
  // isEmailVerified (shared with AuthProvider) is the single source of truth:
  // accounts with no email (e.g. OTP-linked) count as verified, and only the
  // email_confirmed_at timestamp decides confirmation.
  const emailVerified = isEmailVerified(user as never)
  const email = user?.email ?? null
  const usernameLockedMsg = usernameLockMessage(profile?.username_changed_at)
  const usernameLocked = !canChangeUsername(profile?.username_changed_at)

  async function handleSignOut() {
    setBusy(true)
    setErrorMsg(null)
    const { error } = await signOut()
    setBusy(false)
    if (error) setErrorMsg(formatErrorMessage(error))
  }

  return (
    <Section title="Account" description="Profile details, email, and account deletion.">
      <div className="space-y-3">
        {/* Identity summary */}
        <div className="flex items-center gap-3 rounded-xl bg-base-100/80 px-4 py-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-10 rounded-xl object-cover"
              style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }}
            />
          ) : (
            <span className="grid size-10 place-items-center rounded-xl bg-primary/25 text-primary text-sm font-black">
              {(profile?.username ?? "?").slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{profile?.username ?? "You"}</p>
            <p className="truncate text-xs text-base-content/60">
              {email ?? "Signed in"}
              {emailVerified ? "" : " · unconfirmed"}
            </p>
          </div>
        </div>

        {/* Email */}
        <div className="rounded-xl bg-base-100/80 px-4 py-3">
          <p className="text-sm font-bold">Email</p>
          <p className="mt-0.5 truncate text-xs text-base-content/60">
            {email ?? "—"}
            {emailVerified ? " · confirmed" : " · awaiting confirmation"}
          </p>
        </div>

        {/* Username state */}
        <div className="rounded-xl bg-base-100/80 px-4 py-3">
          <p className="text-sm font-bold">Username</p>
          <p className="mt-0.5 text-xs text-base-content/60">
            {usernameLocked
              ? (usernameLockedMsg ?? "Locked for now.")
              : "You can change your username on your profile."}
          </p>
        </div>

        {/* Only render when presence data actually exists — mapProfileRow
            nulls last_seen_at when the RLS policy filters the presence embed
            out, and "Unknown" would leak that internal state to the UI. */}
        {profile?.show_last_seen && profile.last_seen_at ? (
          <div className="rounded-xl bg-base-100/80 px-4 py-3">
            <p className="text-sm font-bold">Last seen</p>
            <p className="mt-0.5 text-xs text-base-content/60">
              {formatLastSeen(profile.last_seen_at) ?? "Just now"}
            </p>
          </div>
        ) : null}

        {errorMsg ? (
          <p className="text-sm text-error" role="alert">
            {errorMsg}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-full font-bold"
            disabled={busy}
            onClick={() => void handleSignOut()}
          >
            <Icon icon={SignIn} className="size-3.5" />
            Log out
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-6 border-t border-base-content/10 pt-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/50">
          Danger zone
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-2 h-auto min-h-0 justify-between rounded-xl px-3 py-2 text-error hover:bg-error/10"
          disabled={busy}
          onClick={() => setDangerOpen(true)}
        >
          <span className="flex items-center gap-2 text-sm font-bold">Delete account</span>
          <span className="text-xs font-normal text-base-content/50">→</span>
        </button>
        <p className="mt-1 text-xs text-base-content/50">
          Permanently removes your profile, uploads, looks, and comments. This cannot be undone.
        </p>
      </div>

      <DangerZoneModal
        open={dangerOpen}
        busy={busy}
        onClose={() => setDangerOpen(false)}
        onDone={async () => {
          setDangerOpen(false)
          await signOut()
        }}
      />
    </Section>
  )
}

function SettingsTabs({
  active,
  onSelect,
}: {
  active: SettingsTab
  onSelect: (tab: SettingsTab) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-base-content/10 pb-3" role="tablist">
      {TABS.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            title={tab.label}
            onClick={() => onSelect(tab.id)}
            className={`btn btn-sm rounded-full font-extrabold gap-2 transition-colors transition-transform active:scale-[0.96] ${
              selected
                ? "btn-primary shadow-sm"
                : "btn-ghost text-base-content/70 hover:text-base-content"
            }`}
          >
            <Icon icon={tab.icon} className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = parseSettingsTab(searchParams.toString())

  function selectTab(next: SettingsTab) {
    if (next === tab) return
    // Replace, not push: tab switches are page-internal state changes, and
    // pushing would make the Back button walk through previous tabs instead
    // of leaving settings entirely.
    navigate(`/settings${settingsTabQuery(next)}`, { replace: true })
  }

  function goBack() {
    // React Router v7 tracks the history index in history.state.idx. When the
    // user arrived from an in-app page (idx > 0) we pop one history entry,
    // which returns them exactly where they were — tab state and all. When
    // they landed here directly (new tab, bookmark) fall back to Explore.
    const hasPrevious = window.history.length > 1 && window.history.state?.idx > 0
    if (hasPrevious) navigate(-1)
    else navigate("/", { replace: true })
  }

  return (
    <div className="space-y-6">
      <HeadMeta title="Settings · looms" description="Manage your looms account settings." />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3.5 border-b border-base-content/10 pb-6">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Icon icon={Gear} className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-balance sm:text-3xl">Settings</h1>
          <p className="text-xs font-semibold text-base-content/60 text-pretty">
            Privacy, uploads, and account controls in one place
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm ml-auto rounded-full font-bold gap-2 text-base-content/70 hover:text-base-content"
          title="Go back"
          aria-label="Go back"
          onClick={goBack}
        >
          <Icon icon={ArrowLeft} className="size-4" />
          Back
        </button>
      </div>

      <SettingsTabs active={tab} onSelect={selectTab} />

      <div className="pt-2">
        {tab === "profile" ? <ProfileSection /> : null}
        {tab === "privacy" ? <PrivacySection /> : null}
        {tab === "uploads" ? <UploadsSection /> : null}
        {tab === "account" ? <AccountSection /> : null}
      </div>
    </div>
  )
}

export function SettingsRoute() {
  return (
    <RequireAuth
      title="Sign in to open settings"
      body="Your privacy, upload, and account controls live here once you're signed in."
    >
      <SettingsPage />
    </RequireAuth>
  )
}
