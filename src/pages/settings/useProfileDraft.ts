import { useState } from "react"
import type { ProfileRow } from "../../lib/supabase"
import { formatErrorMessage } from "../../lib/errorFormat"

export function computeProfilePatch(
  profile: Pick<ProfileRow, "username" | "minecraft_username" | "bio">,
  draft: {
    username: string
    minecraftUsername: string
    bio: string
  },
): Partial<Pick<ProfileRow, "username" | "minecraft_username" | "bio">> {
  const patch: Partial<Pick<ProfileRow, "username" | "minecraft_username" | "bio">> = {}
  if (draft.username !== profile.username) {
    patch.username = draft.username
  }
  if ((draft.minecraftUsername || null) !== (profile.minecraft_username ?? null)) {
    patch.minecraft_username = draft.minecraftUsername || null
  }
  if ((draft.bio || null) !== (profile.bio ?? null)) {
    patch.bio = draft.bio || null
  }
  return patch
}

export function useProfileDraft(
  profile: ProfileRow | null,
  updateProfile: (patch: Partial<ProfileRow>) => Promise<{ error: Error | null }>,
) {
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

  async function handleSave(busy: boolean) {
    if (!profile || busy) return
    setSaving(true)
    setErrorMsg(null)
    setSavedMsg(null)

    const patch = computeProfilePatch(profile, {
      username: draftUsername,
      minecraftUsername: draftMc,
      bio: draftBio,
    })

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

  return {
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
  }
}
