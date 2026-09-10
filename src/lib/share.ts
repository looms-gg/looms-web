import { withBase } from "./basePath"

export const DEFAULT_ORIGIN = "https://looms.gg"

export function getCanonicalUrl(path: string): string {
  const origin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : DEFAULT_ORIGIN
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${origin}${withBase(normalizedPath)}`
}

export function getPieceShareUrl(pieceId: string): string {
  return getCanonicalUrl(`/piece/${pieceId}`)
}

export function getLookShareUrl(lookId: string): string {
  return getCanonicalUrl(`/look/${lookId}`)
}

export async function copyShareLink(url: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      // Fall through to execCommand
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea")
      textarea.value = url
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      textarea.style.pointerEvents = "none"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const successful = document.execCommand("copy")
      document.body.removeChild(textarea)
      return successful
    } catch {
      return false
    }
  }

  return false
}
