import { useState } from "react"
import { Flag, Gear } from "@phosphor-icons/react"
import { Link } from "react-router-dom"
import { Icon } from "../../components/ui/Icon"
import type { ProfileRow } from "../../lib/supabase"
import { useAuth } from "../../state/auth"
import { AuthModal } from "../../components/auth/AuthModal"
import { ReportModal } from "../../components/moderation/ReportModal"
import {
  formatLastSeen,
  initialsFromUsername,
  resolveAvatarUrl,
} from "../../state/profileDisplay"

/**
 * Display-only profile header. Editing (avatar, banner, username, bio,
 * privacy) lives in /settings so there is one surface for every mutation.
 */
export function ProfileHeader({
  profile,
  isOwner,
}: {
  profile: ProfileRow
  isOwner: boolean
  /** Kept for API compatibility; settings owns saving now. */
  onSaved?: () => void | Promise<void>
}) {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const avatarUrl = resolveAvatarUrl(profile)
  const initials = initialsFromUsername(profile.username)
  const lastSeenLabel =
    profile.show_last_seen ? formatLastSeen(profile.last_seen_at) : null

  return (
    <section className="overflow-hidden rounded-[18px] bg-base-200">
      <div className="relative">
        <div
          className="h-36 w-full bg-base-300 bg-cover bg-center sm:h-44"
          style={
            profile.banner_url
              ? { backgroundImage: `url(${profile.banner_url})` }
              : undefined
          }
          role="img"
          aria-label="Profile banner"
        />

        <div className="absolute -bottom-10 left-5 sm:left-6">
          <div
            className="grid size-20 place-items-center overflow-hidden rounded-full border-4 border-base-200 bg-base-300 text-xl font-extrabold sm:size-24"
            title={profile.username}
            role="img"
            aria-label={`${profile.username} avatar`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5 pt-14 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1
              className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-left text-2xl font-extrabold"
              title={profile.username}
            >
              {profile.username}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
              {lastSeenLabel ? <span title="Last seen">{lastSeenLabel}</span> : null}
            </div>
          </div>

          {isOwner ? (
            <Link
              to="/settings?tab=profile"
              className="btn btn-ghost btn-sm btn-circle min-h-11 min-w-11 text-base-content/70 hover:text-base-content"
              title="Edit profile"
              aria-label="Edit profile"
            >
              <Icon icon={Gear} className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle min-h-11 min-w-11 text-base-content/60 hover:text-error"
              title="Report profile"
              aria-label="Report profile"
              onClick={() => {
                if (!user) {
                  setAuthOpen(true)
                  return
                }
                setReportOpen(true)
              }}
            >
              <Icon icon={Flag} className="size-4" />
            </button>
          )}
        </div>

        {profile.bio ? (
          <p className="block w-full rounded-xl px-1 py-1 text-sm whitespace-pre-wrap">
            {profile.bio}
          </p>
        ) : null}
      </div>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      {user ? (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="profile"
          targetId={profile.id}
          targetLabel={`Profile: @${profile.username}`}
          reporterId={user.id}
        />
      ) : null}
    </section>
  )
}
