import { useCallback, useState } from "react"
import { formatErrorMessage } from "../../lib/errorFormat"
import { uploadProfileImage } from "../profile/uploadProfileImage"
import type { ProfileCrop } from "../profile/compressProfileImage"
import { useAuth } from "../../state/auth"

export type ProfileImageKind = "avatar" | "banner"

/**
 * Shared avatar/banner flow: upload to storage, then point the profile row at
 * the new URL. Used by both the profile header and the settings page so the
 * two surfaces cannot drift.
 */
export type ProfileImageUploadResult = { ok: boolean; error: string | null }

export function useProfileImageUpload(options?: { onSaved?: () => void | Promise<void> }) {
  const { profile, updateProfile } = useAuth()
  const [uploading, setUploading] = useState<ProfileImageKind | null>(null)

  const upload = useCallback(
    async (
      kind: ProfileImageKind,
      file: File,
      crop?: ProfileCrop,
    ): Promise<ProfileImageUploadResult> => {
      if (!profile) return { ok: false, error: null }
      setUploading(kind)
      try {
        const url = await uploadProfileImage(profile.id, kind, file, crop)
        const { error } =
          kind === "avatar"
            ? await updateProfile({ avatar_url: url })
            : await updateProfile({ banner_url: url })
        if (error) {
          return { ok: false, error: formatErrorMessage(error) }
        }
        await options?.onSaved?.()
        return { ok: true, error: null }
      } catch (err) {
        return { ok: false, error: formatErrorMessage(err) }
      } finally {
        setUploading(null)
      }
    },
    [profile, updateProfile, options?.onSaved],
  )

  return { upload, uploading }
}
