import { useState } from "react"
import { SignIn } from "@phosphor-icons/react"
import { useAuth } from "../../state/auth"
import { formatErrorMessage } from "../../lib/errorFormat"
import { isEmailVerified } from "../../lib/emailStatus"
import {
  canChangeUsername,
  formatLastSeen,
  resolveAvatarUrl,
  usernameLockMessage,
} from "../../lib/profileDisplay"
import { DangerZoneModal } from "../profile/DangerZoneModal"
import { Icon } from "../../components/ui/Icon"

function AccountIdentityCard({
  avatarUrl,
  username,
  email,
  emailVerified,
}: {
  avatarUrl: string | null
  username?: string
  email: string | null
  emailVerified: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-base-100/80 px-4 py-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-10 rounded-xl object-cover"
          style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }}
        />
      ) : (
        <span className="grid size-10 place-items-center rounded-xl bg-primary/25 text-primary text-sm font-extrabold">
          {(username ?? "?").slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{username ?? "You"}</p>
        <p className="truncate text-xs text-base-content/75">
          {email ?? "Signed in"}
          {emailVerified ? "" : " · unconfirmed"}
        </p>
      </div>
    </div>
  )
}

function AccountEmailCard({
  email,
  emailVerified,
}: {
  email: string | null
  emailVerified: boolean
}) {
  return (
    <div className="rounded-xl bg-base-100/80 px-4 py-3">
      <p className="text-sm font-bold">Email</p>
      <p className="mt-0.5 truncate text-xs text-base-content/75">
        {email ?? "—"}
        {emailVerified ? " · confirmed" : " · awaiting confirmation"}
      </p>
    </div>
  )
}

function AccountUsernameCard({
  usernameLocked,
  usernameLockedMsg,
}: {
  usernameLocked: boolean
  usernameLockedMsg: string | null
}) {
  return (
    <div className="rounded-xl bg-base-100/80 px-4 py-3">
      <p className="text-sm font-bold">Username</p>
      <p className="mt-0.5 text-xs text-base-content/75">
        {usernameLocked
          ? (usernameLockedMsg ?? "Locked for now.")
          : "You can change your username on your profile."}
      </p>
    </div>
  )
}

function AccountLastSeenCard({ lastSeenAt }: { lastSeenAt: string }) {
  return (
    <div className="rounded-xl bg-base-100/80 px-4 py-3">
      <p className="text-sm font-bold">Last seen</p>
      <p className="mt-0.5 text-xs text-base-content/75">
        {formatLastSeen(lastSeenAt) ?? "Just now"}
      </p>
    </div>
  )
}

function DangerZoneBlock({
  busy,
  onOpenDanger,
}: {
  busy: boolean
  onOpenDanger: () => void
}) {
  return (
    <div className="mt-6 border-t border-base-content/10 pt-4">
      <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/65">
        Danger zone
      </p>
      <button
        type="button"
        className="btn btn-ghost btn-sm mt-2 h-auto min-h-0 justify-between rounded-xl px-3 py-2 text-error hover:bg-error/10"
        disabled={busy}
        onClick={onOpenDanger}
      >
        <span className="flex items-center gap-2 text-sm font-bold">Delete account</span>
        <span className="text-xs font-normal text-base-content/60">→</span>
      </button>
      <p className="mt-1 text-xs text-base-content/65">
        Permanently removes your profile, uploads, looks, and comments. This cannot be undone.
      </p>
    </div>
  )
}

export function AccountSection() {
  const { user, profile, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dangerOpen, setDangerOpen] = useState(false)

  const avatarUrl = resolveAvatarUrl(profile)
  // isEmailVerified (shared with AuthProvider) is the single source of truth:
  // accounts with no email (e.g. OTP-linked) count as verified, and only the
  // email_confirmed_at timestamp decides confirmation.
  const emailVerified = isEmailVerified(user)
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

  const handleOpenDanger = () => setDangerOpen(true)
  const handleCloseDanger = () => setDangerOpen(false)
  const handleDoneDanger = async () => {
    setDangerOpen(false)
    await signOut()
  }

  return (
    <section className="rounded-[18px] bg-base-200 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">Account</h2>
      <p className="mt-0.5 text-sm text-base-content/75">
        Profile details, email, and account deletion.
      </p>
      <div className="mt-4 space-y-3">
        {/* Identity summary */}
        <AccountIdentityCard
          avatarUrl={avatarUrl}
          username={profile?.username}
          email={email}
          emailVerified={emailVerified}
        />

        {/* Email */}
        <AccountEmailCard email={email} emailVerified={emailVerified} />

        {/* Username state */}
        <AccountUsernameCard
          usernameLocked={usernameLocked}
          usernameLockedMsg={usernameLockedMsg}
        />

        {/* Presence state */}
        {profile?.show_last_seen && profile.last_seen_at ? (
          <AccountLastSeenCard lastSeenAt={profile.last_seen_at} />
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
            <Icon icon={SignIn} size="sm" />
            Log out
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <DangerZoneBlock busy={busy} onOpenDanger={handleOpenDanger} />

      <DangerZoneModal
        open={dangerOpen}
        busy={busy}
        onClose={handleCloseDanger}
        onDone={handleDoneDanger}
      />
    </section>
  )
}
