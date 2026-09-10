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
export function useProfileImageUpload(options?: { onSaved?: () => void | Promise<void> }) {
  const { profile, updateProfile } = useAuth()
  const [uploading, setUploading] = useState<ProfileImageKind | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const upload = useCallback(
    async (kind: ProfileImageKind, file: File, crop?: ProfileCrop): Promise<boolean> => {
      if (!profile) return false
      setUploading(kind)
      setErrorMsg(null)
      try {
        const url = await uploadProfileImage(profile.id, kind, file, crop)
        const { error } =
          kind === "avatar"
            ? await updateProfile({ avatar_url: url })
            : await updateProfile({ banner_url: url })
        if (error) {
          setErrorMsg(formatErrorMessage(error))
          return false
        }
        await options?.onSaved?.()
        return true
      } catch (err) {
        setErrorMsg(formatErrorMessage(err))
        return false
      } finally {
        setUploading(null)
      }
    },
    [profile, updateProfile, options?.onSaved],
  )

  return { upload, uploading, errorMsg }
}
