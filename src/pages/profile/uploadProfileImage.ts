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
): Promise<{ url: string | null; error: Error | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      url: null,
      error: new Error("Invalid file type: profile images must be .png, .jpg, .jpeg, or .webp files."),
    }
  }

  const sizeCheck = validateFileSize(file, MAX_LIMITS.FILE_SIZE_BYTES)
  if (!sizeCheck.valid) {
    return { url: null, error: new Error(sizeCheck.error ?? "File is too large.") }
  }

  let compressed: File
  try {
    compressed = await compressProfileImage(file, kind)
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err : new Error("Couldn't compress image."),
    }
  }

  const compressedCheck = validateFileSize(compressed, MAX_LIMITS.FILE_SIZE_BYTES)
  if (!compressedCheck.valid) {
    return { url: null, error: new Error(compressedCheck.error ?? "Compressed file is too large.") }
  }

  const ext = extensionFor(compressed)
  const storagePath = `${userId}/${kind}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from("profiles").upload(storagePath, compressed, {
    contentType: compressed.type,
    upsert: true,
  })

  if (uploadError) {
    return { url: null, error: new Error(uploadError.message) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("profiles").getPublicUrl(storagePath)

  return { url: publicUrl, error: null }
}
