import { useEffect, useRef, useState } from "react"
import { loadTurnstileScript, resolveTurnstileSiteKey } from "../../lib/turnstile"

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      "expired-callback": () => void
      "error-callback": () => void
      theme?: "light" | "dark" | "auto"
      retry?: "auto" | "never"
    },
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

function getTurnstile(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
  onError?: (message: string | null) => void
}

// Renders an explicit Turnstile checkbox and reports the token upward.
// Resets (clearing the token) whenever `resetKey` changes, e.g. switching
// auth modes inside the modal.
export function TurnstileWidget({ onToken, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const siteKey = resolveTurnstileSiteKey()
    if (!siteKey || !containerRef.current) return
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const turnstile = getTurnstile()
        if (!turnstile) return
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null)
            setFailed(true)
            onError?.("Captcha failed to load. Please retry.")
          },
          theme: "dark",
          retry: "auto",
        })
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        onError?.("Captcha failed to load. Please retry.")
      })

    return () => {
      cancelled = true
      const turnstile = getTurnstile()
      if (widgetIdRef.current && turnstile) {
        turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // onToken/onError are read through refs at call time via the closures
    // below; callers pass stable callbacks, so they are safe to omit here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRetry() {
    setFailed(false)
    onError?.(null)
    const turnstile = getTurnstile()
    if (widgetIdRef.current && turnstile) {
      turnstile.reset(widgetIdRef.current)
    }
  }

  if (failed) {
    return (
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center rounded-[10px] border border-base-content/10 bg-base-100 text-xs font-bold text-base-content/60 transition-colors duration-150 hover:text-primary"
        onClick={handleRetry}
      >
        Captcha failed — tap to retry
      </button>
    )
  }

  return <div ref={containerRef} className="flex justify-center" />
}
