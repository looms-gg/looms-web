export const MAX_LIMITS = {
  FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2 MB
  PIECE_NAME: 50,
  PIECE_DESCRIPTION: 500,
  LOOK_NAME: 50,
  LOOK_DESCRIPTION: 500,
  USERNAME: 30,
  MINECRAFT_USERNAME: 16,
  BIO: 300,
  SEARCH_QUERY: 80,
  COMMENT: 500,
} as const

// Unicode directional overrides and invisible control characters:
// \u200B-\u200D (zero-width space, non-joiner, joiner)
// \uFEFF (zero-width no-break space / BOM)
// \u202A-\u202E (LRE, RLE, PDF, LRO, RLO)
// \u2066-\u2069 (LRI, RLI, FSI, PDI)
// \u200E, \u200F (LRM, RLM)
// ASCII control chars 0x00-0x1F, 0x7F
const DANGEROUS_CHARS_REGEX =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069\u200E\u200F]/g

/**
 * Strips HTML tags, script elements, unsafe Unicode controls, and clamps length.
 */
export function sanitizeText(
  input: string | null | undefined,
  maxLength: number,
  options?: { multiline?: boolean },
): string {
  if (!input) return ""

  let text = String(input)

  text = text.replace(/<\s*(?:script|style|iframe)[^>]*>[\s\S]*?<\s*\/\s*(?:script|style|iframe)\s*>/gi, "")

  text = text.replace(/<[^>]*>?/gm, "")

  text = text.replace(DANGEROUS_CHARS_REGEX, "")

  if (options?.multiline) {
      text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  } else {
      text = text.replace(/[\r\n\t]+/g, " ")
  }

  text = text.trim()

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trimEnd()
  }

  return text
}

/**
 * Sanitizes Loom username: alphanumeric, dashes, and underscores only, clamped to max length.
 */
export function sanitizeUsername(input: string | null | undefined): string {
  if (!input) return ""
  const clean = sanitizeText(input, MAX_LIMITS.USERNAME)
  const allowed = clean.replace(/[^a-zA-Z0-9_-]/g, "")
  return allowed.slice(0, MAX_LIMITS.USERNAME)
}

/**
 * Sanitizes Minecraft Java username: alphanumeric and underscores only, up to 16 chars.
 */
export function sanitizeMinecraftUsername(input: string | null | undefined): string {
  if (!input) return ""
  const clean = sanitizeText(input, MAX_LIMITS.MINECRAFT_USERNAME)
  const allowed = clean.replace(/[^a-zA-Z0-9_]/g, "")
  return allowed.slice(0, MAX_LIMITS.MINECRAFT_USERNAME)
}

/**
 * Validates URLs to only allow safe HTTP / HTTPS protocols.
 * Rejects javascript:, data:, vbscript: and malformed URLs.
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validates an uploaded file's size against a byte limit.
 */
export function validateFileSize(
  file: File,
  maxSizeBytes: number = MAX_LIMITS.FILE_SIZE_BYTES,
): { valid: boolean; error?: string } {
  if (file.size > maxSizeBytes) {
    const mbLimit = (maxSizeBytes / (1024 * 1024)).toFixed(0)
    const kbLimit = (maxSizeBytes / 1024).toFixed(0)
    const limitLabel = maxSizeBytes >= 1024 * 1024 ? `${mbLimit} MB` : `${kbLimit} KB`
    return {
      valid: false,
      error: `File size exceeds the ${limitLabel} limit (selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    }
  }
  return { valid: true }
}
