/** React Router basename from Vite `BASE_URL` (always ends with `/`). */
export function routerBasename(baseUrl = import.meta.env.BASE_URL): string {
  if (!baseUrl || baseUrl === "/") return ""
  return baseUrl.replace(/\/$/, "")
}
