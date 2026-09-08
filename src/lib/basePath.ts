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

