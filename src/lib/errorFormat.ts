/**
 * Formats API, Supabase, and PostgreSQL server-side error responses
 * into user-friendly notices for rate limiting, quotas, and validation.
 */

export function formatErrorMessage(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred. Please try again."
  }

  let rawMessage = ""
  if (typeof error === "string") {
    rawMessage = error
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as { message?: unknown; details?: unknown; error_description?: unknown }
    if (typeof errObj.message === "string" && errObj.message.trim().length > 0) {
      rawMessage = errObj.message
    } else if (typeof errObj.error_description === "string") {
      rawMessage = errObj.error_description
    } else if (typeof errObj.details === "string") {
      rawMessage = errObj.details
    }
  }

  const lower = rawMessage.toLowerCase()

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    if (
      lower.includes("over_email_send_rate_limit") ||
      (lower.includes("email") && lower.includes("rate limit"))
    ) {
      return "Email rate limit reached. Only a few emails can be sent per hour, so please wait a bit before requesting another one."
    }
    if (
      lower.includes("over_request_rate_limit") ||
      lower.includes("request rate limit")
    ) {
      return "Too many attempts in a short time. Please wait a couple of minutes and try again."
    }
    if (lower.includes("garment") || lower.includes("texture")) {
      return "Upload rate limit reached. You can upload up to 15 garments every 10 minutes. Please wait a moment before trying again."
    }
    if (lower.includes("look")) {
      return "Save rate limit reached. You can save up to 30 looks every 10 minutes. Please wait a moment before saving again."
    }
    if (lower.includes("like")) {
      return "Like rate limit reached. Please wait a moment before liking more items."
    }
    if (lower.includes("wardrobe")) {
      return "Wardrobe add rate limit reached. You can add up to 60 pieces every 10 minutes. Please wait a moment before trying again."
    }
    if (lower.includes("comment")) {
      return "Comment rate limit reached. You can post up to 30 comments every 10 minutes. Please wait a moment before trying again."
    }
    if (lower.includes("profile")) {
      return "Profile update rate limit reached. Please wait a few minutes before editing your profile again."
    }
    if (lower.includes("content_report") || lower.includes("report")) {
      return "Report rate limit reached. You can submit up to 10 reports every 10 minutes. Please wait before submitting again."
    }
    return "Rate limit reached. Please slow down and wait a moment before trying again."
  }

  if (lower.includes("quota exceeded") || lower.includes("account quota")) {
    if (lower.includes("content_report") || lower.includes("report")) {
      return "Report limit reached. You have too many pending reports under review. Please wait for them to be processed."
    }
    if (lower.includes("garment_comments") || lower.includes("comment")) {
      return "Comment limit reached (max 2000 comments). Delete older comments before posting more."
    }
    if (lower.includes("garment")) {
      return "Garment storage full (max 150 items). Please remove some existing garments from your wardrobe to upload new ones."
    }
    if (lower.includes("look")) {
      return "Look storage full (max 100 looks). Please delete older looks in your wardrobe to save new ones."
    }
    if (lower.includes("like")) {
      return "You've liked too many items (max 5000 liked items). Unlike some items before liking more."
    }
    if (lower.includes("wardrobe")) {
      return "Wardrobe full (max 500 pieces). Remove some saved pieces before adding more."
    }
    return "Account quota exceeded. Please remove existing items before adding new ones."
  }

  if (lower.includes("username can only be changed once every 15 days")) {
    return rawMessage.trim() || "Username can only be changed once every 15 days."
  }

  if (lower.includes("file size exceeds") || lower.includes("maximum of 2mb")) {
    return "File is too large. Textures must be under 2MB."
  }
  if (lower.includes("invalid file type") || lower.includes(".png")) {
    return "Invalid file format. Minecraft skin textures must be valid PNG files."
  }

  return rawMessage || "An unexpected error occurred. Please try again."
}
