/** React Router basename from Vite `BASE_URL` (always ends with `/`). */
export function routerBasename(baseUrl = import.meta.env.BASE_URL): string {
  if (!baseUrl || baseUrl === "/") return ""
  return baseUrl.replace(/\/$/, "")
}

export function withBase(path: string, baseUrl = import.meta.env.BASE_URL): string {
  const base = routerBasename(baseUrl)
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalized}`
}

/**
 * Absolute URL of the app root, including the Vite base path when deployed to a
 * subdirectory (GitHub Pages → /looms-web/). Use this for redirects that leave
 * the SPA and come back via the URL bar (email confirmation links, OAuth, …);
 * a bare `window.location.origin` drops the base path and 404s on Pages.
 */
export function absoluteAppUrl(
  origin = typeof window !== "undefined" ? window.location.origin : "",
  baseUrl = import.meta.env.BASE_URL,
): string {
  return `${origin}${routerBasename(baseUrl)}`
}

