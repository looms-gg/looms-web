import { useRef, useState, type ChangeEvent } from "react"
import { ImageCropModal, type CropRect } from "./ImageCropModal"
import { Camera, ImageSquare } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS } from "../../lib/sanitize"
import { useAuth } from "../../state/auth"
import {
  canChangeUsername,
  initialsFromUsername,
  nextUsernameChangeAt,
  resolveAvatarUrl,
} from "../../state/profileDisplay"
import { useProfileImageUpload } from "./useProfileImageUpload"

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-base-100/80 px-4 py-3">
      <label className="block text-sm font-bold">{label}</label>
      {hint ? <p className="mt-0.5 text-xs text-base-content/60">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </div>
  )
}

export function ProfileSection() {
  const { profile, updateProfile } = useAuth()
  const { upload, uploading, errorMsg: uploadError } = useProfileImageUpload()
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  // Pending file flows through the crop modal before upload.
  const [cropState, setCropState] = useState<{
    kind: "avatar" | "banner"
    file: File
  } | null>(null)

  const [draftUsername, setDraftUsername] = useState(profile?.username ?? "")
  const [draftMc, setDraftMc] = useState(profile?.minecraft_username ?? "")
  const [draftBio, setDraftBio] = useState(profile?.bio ?? "")
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Re-sync drafts when the profile changes underneath us (save, refetch) —
  // done via adjust-state-during-render rather than an effect, per React docs.
  const [syncedProfile, setSyncedProfile] = useState(profile)
  if (profile !== syncedProfile) {
    setSyncedProfile(profile)
    setDraftUsername(profile?.username ?? "")
    setDraftMc(profile?.minecraft_username ?? "")
    setDraftBio(profile?.bio ?? "")
  }

  const avatarUrl = resolveAvatarUrl(profile)
  const usernameLocked = !canChangeUsername(profile?.username_changed_at)
  const nextChange = nextUsernameChangeAt(profile?.username_changed_at)
  const busy = saving || uploading !== null

  async function handleSave() {
    if (!profile || busy) return
    setSaving(true)
    setErrorMsg(null)
    setSavedMsg(null)

    // Sanitization happens server-side through updateProfile; only send the
    // fields the user actually changed so unmodified data is never re-written.
    const patch: Parameters<typeof updateProfile>[0] = {}
    if (draftUsername !== profile.username) patch.username = draftUsername
    if ((draftMc || null) !== (profile.minecraft_username ?? null)) {
      patch.minecraft_username = draftMc || null
    }
    if ((draftBio || null) !== (profile.bio ?? null)) patch.bio = draftBio || null

    if (Object.keys(patch).length === 0) {
      setSaving(false)
      setSavedMsg("Nothing to save.")
      return
    }

    const { error } = await updateProfile(patch)
    setSaving(false)
    if (error) {
      setErrorMsg(formatErrorMessage(error))
      return
    }
    setSavedMsg("Profile saved.")
  }

  async function onImagePicked(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setErrorMsg(null)
    setSavedMsg(null)
    // Route through the crop modal instead of uploading the raw pick.
    setCropState({ kind, file })
  }

  async function handleCropConfirm(crop: CropRect) {
    if (!cropState) return
    const { kind, file } = cropState
    const ok = await upload(kind, file, crop)
    setCropState(null)
    if (ok) setSavedMsg(kind === "avatar" ? "Avatar updated." : "Banner updated.")
    else setErrorMsg(uploadError)
  }

  return (
    <section className="rounded-[18px] bg-base-200 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">Profile</h2>
      <p className="mt-0.5 text-sm text-base-content/65">
        Your public identity across looms.
      </p>

      {/* Avatar + banner */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl bg-base-100/80 px-4 py-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-14 rounded-full object-cover"
              style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }} />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/25 text-primary text-base font-black">
              {initialsFromUsername(profile?.username ?? "?")}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold">Avatar</p>
            <button
              type="button"
              className="btn btn-ghost btn-xs mt-1 rounded-full font-bold text-primary"
              disabled={busy}
              onClick={() => avatarInputRef.current?.click()}
            >
              <Icon icon={Camera} size="sm" />
              {uploading === "avatar" ? "Uploading…" : "Change"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-base-100/80 px-4 py-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-base-300 text-base-content/60">
            <Icon icon={ImageSquare} size="lg" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Banner</p>
            <button
              type="button"
              className="btn btn-ghost btn-xs mt-1 rounded-full font-bold text-primary"
              disabled={busy}
              onClick={() => bannerInputRef.current?.click()}
            >
              <Icon icon={ImageSquare} size="sm" />
              {uploading === "banner" ? "Uploading…" : "Change"}
            </button>
          </div>
        </div>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Upload avatar"
        onChange={(e) => void onImagePicked("avatar", e)} />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Upload banner"
        onChange={(e) => void onImagePicked("banner", e)} />

      <ImageCropModal
        open={cropState !== null}
        file={cropState?.file ?? null}
        aspect={cropState?.kind === "banner" ? 3 : 1}
        shape={cropState?.kind === "banner" ? "rect" : "circle"}
        title={cropState?.kind === "banner" ? "Crop banner" : "Crop avatar"}
        busy={uploading !== null}
        onClose={() => setCropState(null)}
        onConfirm={(crop) => void handleCropConfirm(crop)} />

      <div className="mt-3 space-y-3">
        <FieldRow
          label="Username"
          hint={
            usernameLocked
              ? (nextChange
                  ? `You can change your username again on ${nextChange.toLocaleDateString()}.`
                  : "Username can only be changed once every 15 days.")
              : "Shown on your profile page and next to your uploads."
          }
        >
          <input
            type="text"
            maxLength={MAX_LIMITS.USERNAME}
            value={draftUsername}
            disabled={busy || usernameLocked}
            onChange={(e) => setDraftUsername(e.target.value)}
            className="input input-bordered input-sm w-full rounded-xl bg-base-200/60 font-bold"
            aria-label="Username" />
        </FieldRow>

        <FieldRow
          label="Minecraft username"
          hint="Used for your avatar and skin previews. Alphanumeric and underscores, up to 16 characters."
        >
          <input
            type="text"
            maxLength={MAX_LIMITS.MINECRAFT_USERNAME}
            value={draftMc}
            disabled={busy}
            onChange={(e) => setDraftMc(e.target.value)}
            className="input input-bordered input-sm w-full rounded-xl bg-base-200/60 font-bold"
            aria-label="Minecraft username"
            placeholder="Optional" />
        </FieldRow>

        <FieldRow label="Bio" hint="A short public blurb on your profile.">
          <textarea
            maxLength={MAX_LIMITS.BIO}
            value={draftBio}
            disabled={busy}
            onChange={(e) => setDraftBio(e.target.value)}
            className="textarea textarea-bordered w-full min-h-24 rounded-xl bg-base-200/60"
            aria-label="Bio"
            placeholder="Tell the plaza who you are…" />
        </FieldRow>
      </div>

      {errorMsg ? (
        <p className="mt-3 text-sm text-error" role="alert">
          {errorMsg}
        </p>
      ) : null}
      {savedMsg ? (
        <p className="mt-3 text-sm text-success" role="status">
          {savedMsg}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-full font-extrabold"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {saving ? <span className="loading loading-spinner loading-xs" /> : null}
          Save profile
        </button>
      </div>
    </section>
  )
}
