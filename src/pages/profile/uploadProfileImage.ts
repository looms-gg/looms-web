import { supabase } from "../../lib/supabase"
import { MAX_LIMITS, validateFileSize } from "../../lib/sanitize"
import { compressProfileImage } from "./compressProfileImage"

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])

function extensionFor(file: File): string {
  if (file.type === "image/jpeg") return "jpg"
  if (file.type === "image/webp") return "webp"
  return "png"
}

export async function uploadProfileImage(
  userId: string,
  kind: "avatar" | "banner",
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(
      "Invalid file type: profile images must be .png, .jpg, .jpeg, or .webp files.",
    )
  }

  const sizeCheck = validateFileSize(file, MAX_LIMITS.FILE_SIZE_BYTES)
  if (!sizeCheck.valid) {
    throw new Error(sizeCheck.error ?? "File is too large.")
  }

  const compressed = await compressProfileImage(file, kind)

  const compressedCheck = validateFileSize(compressed, MAX_LIMITS.FILE_SIZE_BYTES)
  if (!compressedCheck.valid) {
    throw new Error(compressedCheck.error ?? "Compressed file is too large.")
  }

  const ext = extensionFor(compressed)
  const storagePath = `${userId}/${kind}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from("profiles").upload(storagePath, compressed, {
    contentType: compressed.type,
    upsert: true,
  })

  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from("profiles").getPublicUrl(storagePath)

  return publicUrl
}
