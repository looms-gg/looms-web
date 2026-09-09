import { useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { faCamera, faFlag, faGear, faUpload } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../../components/ui/FaIcon"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS } from "../../lib/sanitize"
import type { ProfileRow } from "../../lib/supabase"
import { useAuth } from "../../state/auth"
import { AuthModal } from "../../components/auth/AuthModal"
import { ReportModal } from "../../components/moderation/ReportModal"
import {
  canChangeUsername,
  formatLastSeen,
  initialsFromUsername,
  nextUsernameChangeAt,
  resolveAvatarUrl,
} from "../../state/profileDisplay"
import { ProfilePrivacyModal } from "./ProfilePrivacyModal"
import { uploadProfileImage } from "./uploadProfileImage"

export function ProfileHeader({
  profile,
  isOwner,
  onSaved,
}: {
  profile: ProfileRow
  isOwner: boolean
  onSaved: () => void | Promise<void>
}) {
  const { user, updateProfile, signOut } = useAuth()
  const bannerInputId = useId()
  const avatarInputId = useId()
  const bannerRef = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const [editingBio, setEditingBio] = useState(false)
  const [draftBio, setDraftBio] = useState(profile.bio ?? "")
  const [editingUsername, setEditingUsername] = useState(false)
  const [draftUsername, setDraftUsername] = useState(profile.username)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const avatarUrl = resolveAvatarUrl(profile)
  const initials = initialsFromUsername(profile.username)
  const lastSeenLabel =
    profile.show_last_seen ? formatLastSeen(profile.last_seen_at) : null
  const usernameLocked = !canChangeUsername(profile.username_changed_at)
  const nextChange = nextUsernameChangeAt(profile.username_changed_at)

  async function applyUpdate(
    patch: Parameters<typeof updateProfile>[0],
  ): Promise<boolean> {
    setBusy(true)
    setErrorMsg(null)
    const { error } = await updateProfile(patch)
    setBusy(false)
    if (error) {
      setErrorMsg(formatErrorMessage(error))
      return false
    }
    await onSaved()
    return true
  }

  async function onImagePicked(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !isOwner) return
    setBusy(true)
    setErrorMsg(null)
    let url: string
    try {
      url = await uploadProfileImage(profile.id, kind, file)
    } catch (error) {
      setBusy(false)
      setErrorMsg(formatErrorMessage(error))
      return
    }
    const ok = await applyUpdate(
      kind === "avatar" ? { avatar_url: url } : { banner_url: url },
    )
    if (!ok) {
      /* error already set */
    }
  }

  async function saveBio() {
    setEditingBio(false)
    const next = draftBio
    if ((profile.bio ?? "") === next) return
    await applyUpdate({ bio: next || null })
  }

  async function saveUsername() {
    setEditingUsername(false)
    if (draftUsername === profile.username) return
    if (usernameLocked) {
      setDraftUsername(profile.username)
      setErrorMsg(
        nextChange
          ? `You can change your username again on ${nextChange.toLocaleDateString()}.`
          : "Username can only be changed once every 15 days.",
      )
      return
    }
    const ok = await applyUpdate({ username: draftUsername })
    if (!ok) setDraftUsername(profile.username)
  }

  function onBioKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      setDraftBio(profile.bio ?? "")
      setEditingBio(false)
    }
  }

  function onUsernameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      void saveUsername()
    } else if (event.key === "Escape") {
      setDraftUsername(profile.username)
      setEditingUsername(false)
    }
  }

  const ownerChrome =
    "outline outline-2 outline-transparent transition-[outline-color] duration-150 hover:outline-primary/50 focus-visible:outline-primary"

  return (
    <section className="overflow-hidden rounded-[18px] bg-base-200">
      <div className="relative">
        <button
          type="button"
          disabled={!isOwner || busy}
          className={`group/banner relative block h-36 w-full overflow-hidden bg-base-300 bg-cover bg-center sm:h-44 ${
            isOwner ? "cursor-pointer" : "cursor-default"
          }`}
          style={
            profile.banner_url
              ? { backgroundImage: `url(${profile.banner_url})` }
              : undefined
          }
          title={isOwner ? "Change banner" : undefined}
          aria-label={isOwner ? "Change banner" : "Profile banner"}
          onClick={() => isOwner && bannerRef.current?.click()}
        >
          {isOwner ? (
            <>
              <span
                aria-hidden
                className="absolute inset-0 bg-base-content/50 opacity-0 transition-opacity duration-150 group-hover/banner:opacity-100 group-focus-visible/banner:opacity-100"
                style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
              />
              <span
                className="absolute inset-0 grid place-items-center scale-[0.25] opacity-0 blur-[4px] transition-[transform,opacity,filter] duration-150 group-hover/banner:scale-100 group-hover/banner:opacity-100 group-hover/banner:blur-none group-focus-visible/banner:scale-100 group-focus-visible/banner:opacity-100 group-focus-visible/banner:blur-none group-active/banner:scale-95"
                style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
              >
                <span className="grid size-12 place-items-center rounded-full border border-white/25 bg-base-100/90 text-base-content shadow-md">
                  <FaIcon icon={faUpload} className="size-4" />
                </span>
              </span>
            </>
          ) : null}
        </button>
        {isOwner ? (
          <input
            id={bannerInputId}
            ref={bannerRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => void onImagePicked("banner", e)}
          />
        ) : null}

        <div className="absolute -bottom-10 left-5 sm:left-6">
          <button
            type="button"
            disabled={!isOwner || busy}
            className={`group/avatar relative grid size-20 place-items-center overflow-hidden rounded-full border-4 border-base-200 bg-base-300 text-xl font-extrabold sm:size-24 ${
              isOwner ? "cursor-pointer" : "cursor-default"
            }`}
            title={isOwner ? "Change profile picture" : profile.username}
            aria-label={isOwner ? "Change profile picture" : `${profile.username} avatar`}
            onClick={() => isOwner && avatarRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span aria-hidden>{initials}</span>
            )}
            {isOwner ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0 bg-base-content/40 opacity-0 transition-opacity duration-150 group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100"
                  style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
                />
                <span
                  className="absolute inset-0 grid place-items-center text-base-100 scale-[0.25] opacity-0 blur-[4px] transition-[transform,opacity,filter] duration-150 group-hover/avatar:scale-100 group-hover/avatar:opacity-100 group-hover/avatar:blur-none group-focus-visible/avatar:scale-100 group-focus-visible/avatar:opacity-100 group-focus-visible/avatar:blur-none"
                  style={{ transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)" }}
                >
                  <FaIcon icon={faCamera} className="size-4 drop-shadow-sm" />
                </span>
              </>
            ) : null}
          </button>
          {isOwner ? (
            <input
              id={avatarInputId}
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void onImagePicked("avatar", e)}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5 pt-14 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isOwner && editingUsername ? (
              <input
                type="text"
                maxLength={MAX_LIMITS.USERNAME}
                value={draftUsername}
                onChange={(e) => setDraftUsername(e.target.value)}
                onBlur={() => void saveUsername()}
                onKeyDown={onUsernameKeyDown}
                className="input input-bordered input-sm h-10 w-full max-w-xs font-extrabold text-xl"
                aria-label="Edit username"
                autoFocus
              />
            ) : (
              <button
                type="button"
                disabled={!isOwner}
                className={`block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis text-left text-2xl font-extrabold ${
                  isOwner ? ownerChrome : ""
                }`}
                title={profile.username}
                onClick={() => {
                  if (!isOwner) return
                  setDraftUsername(profile.username)
                  setEditingUsername(true)
                }}
              >
                {profile.username}
              </button>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
              {lastSeenLabel ? <span title="Last seen">{lastSeenLabel}</span> : null}
            </div>
            {isOwner && usernameLocked && nextChange ? (
              <p className="mt-1 text-xs text-base-content/60">
                You can change your username again on {nextChange.toLocaleDateString()}.
              </p>
            ) : null}
          </div>

          {isOwner ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle min-h-11 min-w-11 text-base-content/70 hover:text-base-content"
              title="Privacy settings"
              aria-label="Privacy settings"
              disabled={busy}
              onClick={() => setPrivacyOpen(true)}
            >
              <FaIcon icon={faGear} className="size-4" />
            </button>
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
              <FaIcon icon={faFlag} className="size-4" />
            </button>
          )}
        </div>

        {isOwner && editingBio ? (
          <textarea
            maxLength={MAX_LIMITS.BIO}
            value={draftBio}
            onChange={(e) => setDraftBio(e.target.value)}
            onBlur={() => void saveBio()}
            onKeyDown={onBioKeyDown}
            className="textarea textarea-bordered w-full min-h-24"
            aria-label="Edit bio"
            autoFocus
          />
        ) : (
          <button
            type="button"
            disabled={!isOwner}
            className={`block w-full rounded-xl px-1 py-1 text-left text-sm whitespace-pre-wrap ${
              isOwner ? ownerChrome : ""
            } ${!(profile.bio || isOwner) ? "hidden" : ""}`}
            onClick={() => {
              if (!isOwner) return
              setDraftBio(profile.bio ?? "")
              setEditingBio(true)
            }}
          >
            {profile.bio || (isOwner ? "Add a bio" : "")}
          </button>
        )}

        {errorMsg ? (
          <p className="text-sm text-error" role="alert">
            {errorMsg}
          </p>
        ) : null}
      </div>

      <ProfilePrivacyModal
        open={privacyOpen}
        showLastSeen={profile.show_last_seen}
        showLikes={profile.show_likes}
        busy={busy}
        onClose={() => setPrivacyOpen(false)}
        onToggleLastSeen={(next) => {
          void applyUpdate({ show_last_seen: next })
        }}
        onToggleLikes={(next) => {
          void applyUpdate({ show_likes: next })
        }}
        onDeleteAccount={async () => {
          // DangerZoneModal already ran the deletion RPC; sign-out just clears
          // the session so the router reacts to the account being gone.
          await signOut()
        }}
      />

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
