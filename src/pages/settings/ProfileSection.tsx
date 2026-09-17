import { useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { Camera, ImageSquare } from "@phosphor-icons/react"
import { useAuth } from "../../state/auth"
import {
  canChangeUsername,
  nextUsernameChangeAt,
  initialsFromUsername,
  resolveAvatarUrl,
} from "../../lib/content/profileDisplay"
import { Icon } from "../../components/ui/Icon"
import { MAX_LIMITS } from "../../lib/sanitize"
import { useProfileImageUpload } from "./useProfileImageUpload"
import { ImageCropModal, type CropRect } from "./ImageCropModal"
import { computeProfilePatch, useProfileDraft } from "./useProfileDraft"

export { computeProfilePatch }

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-base-content/75">{label}</span>
      </div>
      {children}
      <p className="mt-1 text-xs text-base-content/65">{hint}</p>
    </label>
  )
}

function AvatarUploadCard({
  avatarUrl,
  username,
  busy,
  uploading,
  onClick,
}: {
  avatarUrl: string | null
  username?: string
  busy: boolean
  uploading: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-base-100/80 px-4 py-3">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-14 rounded-full object-cover"
          style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }}
        />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary/25 text-primary text-base font-extrabold">
          {initialsFromUsername(username ?? "?")}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-bold">Avatar</p>
        <button
          type="button"
          className="btn btn-ghost btn-xs mt-1 rounded-full font-bold text-primary"
          disabled={busy}
          onClick={onClick}
        >
          <Icon icon={Camera} size="sm" />
          {uploading ? "Uploading…" : "Change"}
        </button>
      </div>
    </div>
  )
}

function BannerUploadCard({
  busy,
  uploading,
  onClick,
}: {
  busy: boolean
  uploading: boolean
  onClick: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-base-100/80 px-4 py-3">
      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-base-300 text-base-content/75">
        <Icon icon={ImageSquare} size="lg" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold">Banner</p>
        <button
          type="button"
          className="btn btn-ghost btn-xs mt-1 rounded-full font-bold text-primary"
          disabled={busy}
          onClick={onClick}
        >
          <Icon icon={ImageSquare} size="sm" />
          {uploading ? "Uploading…" : "Change"}
        </button>
      </div>
    </div>
  )
}

function getUsernameHint(locked: boolean, nextChange: Date | null): string {
  if (!locked) return "Shown on your profile page and next to your uploads."
  if (nextChange) {
    return `You can change your username again on ${nextChange.toLocaleDateString()}.`
  }
  return "Username can only be changed once every 15 days."
}

function ProfileFields({
  draftUsername,
  draftMc,
  draftBio,
  onUsernameChange,
  onMcChange,
  onBioChange,
  usernameLocked,
  nextChange,
  busy,
}: {
  draftUsername: string
  draftMc: string
  draftBio: string
  onUsernameChange: (value: string) => void
  onMcChange: (value: string) => void
  onBioChange: (value: string) => void
  usernameLocked: boolean
  nextChange: Date | null
  busy: boolean
}) {
  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUsernameChange(e.target.value)
  }
  const handleMcChange = (e: ChangeEvent<HTMLInputElement>) => {
    onMcChange(e.target.value)
  }
  const handleBioChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onBioChange(e.target.value)
  }

  return (
    <div className="mt-3 space-y-3">
      <FieldRow label="Username" hint={getUsernameHint(usernameLocked, nextChange)}>
        <input
          type="text"
          maxLength={MAX_LIMITS.USERNAME}
          value={draftUsername}
          disabled={busy || usernameLocked}
          onChange={handleUsernameChange}
          className="input input-bordered input-sm w-full rounded-xl bg-base-200/60 font-bold"
          aria-label="Username"
        />
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
          onChange={handleMcChange}
          className="input input-bordered input-sm w-full rounded-xl bg-base-200/60 font-bold"
          aria-label="Minecraft username"
          placeholder="Optional"
        />
      </FieldRow>

      <FieldRow label="Bio" hint="A short public blurb on your profile.">
        <textarea
          maxLength={MAX_LIMITS.BIO}
          value={draftBio}
          disabled={busy}
          onChange={handleBioChange}
          className="textarea textarea-bordered w-full min-h-24 rounded-xl bg-base-200/60"
          aria-label="Bio"
          placeholder="Tell the plaza who you are…"
        />
      </FieldRow>
    </div>
  )
}

export function ProfileSection() {
  const { profile, updateProfile } = useAuth()
  const { upload, uploading } = useProfileImageUpload()
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [cropState, setCropState] = useState<{
    kind: "avatar" | "banner"
    file: File
  } | null>(null)

  const {
    draftUsername,
    setDraftUsername,
    draftMc,
    setDraftMc,
    draftBio,
    setDraftBio,
    saving,
    savedMsg,
    setSavedMsg,
    errorMsg,
    setErrorMsg,
    handleSave,
  } = useProfileDraft(profile, updateProfile)

  const avatarUrl = resolveAvatarUrl(profile)
  const usernameLocked = !canChangeUsername(profile?.username_changed_at)
  const nextChange = nextUsernameChangeAt(profile?.username_changed_at)
  const busy = saving || uploading !== null

  function onImagePicked(kind: "avatar" | "banner", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setErrorMsg(null)
    setSavedMsg(null)
    setCropState({ kind, file })
  }

  async function handleCropConfirm(crop: CropRect) {
    if (!cropState) return
    const { kind, file } = cropState
    const result = await upload(kind, file, crop)
    setCropState(null)
    if (result.ok) setSavedMsg(kind === "avatar" ? "Avatar updated." : "Banner updated.")
    else setErrorMsg(result.error)
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()
  const handleBannerClick = () => bannerInputRef.current?.click()
  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => onImagePicked("avatar", e)
  const handleBannerFileChange = (e: ChangeEvent<HTMLInputElement>) => onImagePicked("banner", e)
  const handleCloseCrop = () => setCropState(null)
  const handleConfirmCrop = (crop: CropRect) => {
    void handleCropConfirm(crop)
  }
  const handleSaveClick = () => {
    void handleSave(busy)
  }

  return (
    <section className="rounded-[18px] bg-base-200 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">Profile</h2>
      <p className="mt-0.5 text-sm text-base-content/75">
        Your public identity across looms.
      </p>

      {/* Avatar + banner */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AvatarUploadCard
          avatarUrl={avatarUrl}
          username={profile?.username}
          busy={busy}
          uploading={uploading === "avatar"}
          onClick={handleAvatarClick}
        />

        <BannerUploadCard
          busy={busy}
          uploading={uploading === "banner"}
          onClick={handleBannerClick}
        />
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Upload avatar"
        onChange={handleAvatarFileChange}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Upload banner"
        onChange={handleBannerFileChange}
      />

      <ImageCropModal
        open={cropState !== null}
        file={cropState?.file ?? null}
        aspect={cropState?.kind === "banner" ? 3 : 1}
        shape={cropState?.kind === "banner" ? "rect" : "circle"}
        title={cropState?.kind === "banner" ? "Crop banner" : "Crop avatar"}
        busy={uploading !== null}
        onClose={handleCloseCrop}
        onConfirm={handleConfirmCrop}
      />

      <ProfileFields
        draftUsername={draftUsername}
        draftMc={draftMc}
        draftBio={draftBio}
        onUsernameChange={setDraftUsername}
        onMcChange={setDraftMc}
        onBioChange={setDraftBio}
        usernameLocked={usernameLocked}
        nextChange={nextChange}
        busy={busy}
      />

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
          onClick={handleSaveClick}
        >
          {saving ? <span className="loading loading-spinner loading-xs" /> : null}
          Save profile
        </button>
      </div>
    </section>
  )
}
