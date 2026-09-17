// Cloudflare Turnstile site key (public, safe to ship to the browser).
// Set VITE_TURNSTILE_SITE_KEY in .env.local; the corresponding secret goes in
// Supabase Dashboard → Authentication → Bot Protection.
// Resolved at call time (not import time) so env changes stay testable
// without vi.mock on the module.
export function isTurnstileEnabled(): boolean {
  return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY)
}

// Cloudflare's always-passing test site keys, used so dev/test environments
// without a real site key still exercise the full widget flow.
const TEST_SITE_KEY = "1x00000000000000000000AA"

export function resolveTurnstileSiteKey(): string | null {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || (import.meta.env.DEV ? TEST_SITE_KEY : null)
}

export const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

// Script injection is shared across widget instances so React StrictMode's
// double-mount doesn't create duplicate <script> tags.
let scriptPromise: Promise<void> | null = null

function createScriptTagPromise(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    // `render=explicit` defines window.turnstile synchronously, so the script's
    // load event guarantees the API is ready. Cloudflare's turnstile.ready()
    // throws on async-injected scripts, so we resolve directly instead.
    const handleLoad = () => {
      resolve()
    }
    const handleError = () => {
      scriptPromise = null
      reject(new Error("Failed to load Turnstile script"))
    }
    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)
    document.head.appendChild(script)
  })
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"))
  const globalWindow = window as Window & { turnstile?: unknown }
  if (globalWindow.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = createScriptTagPromise()
  return scriptPromise
}

export { loadTurnstileScript }

export function _resetTurnstileScriptPromiseForTests(): void {
  scriptPromise = null
}
