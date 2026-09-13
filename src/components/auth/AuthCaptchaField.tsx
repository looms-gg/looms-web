import { useState } from "react"
import { isTurnstileEnabled } from "../../lib/turnstile"
import { TurnstileWidget } from "./TurnstileWidget"

/**
 * Owns the captcha token/error/reset state so the auth mode dispatcher
 * carries none of it. `reset()` bumps the reset key to force Turnstile to
 * mint a fresh token: a consumed token replayed on retry is rejected as
 * "timeout-or-duplicate". `clear()` drops the token without re-rendering
 * the widget (used when the modal reopens).
 */
export function useCaptcha() {
  const enabled = isTurnstileEnabled()
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetCount, setResetCount] = useState(0)

  return {
    enabled,
    token,
    error,
    resetCount,
    setToken,
    setError,
    reset() {
      setToken(null)
      setError(null)
      setResetCount((count) => count + 1)
    },
    clear() {
      setToken(null)
      setError(null)
    },
  }
}

export type CaptchaState = ReturnType<typeof useCaptcha>

export function AuthCaptchaField({ captcha }: { captcha: CaptchaState }) {
  if (!captcha.enabled) return null
  return (
    <div>
      <TurnstileWidget
        resetKey={captcha.resetCount}
        onToken={(token) => {
          captcha.setToken(token)
          if (token) captcha.setError(null)
        }}
        onError={(error) => captcha.setError(error)} />
      {captcha.error ? (
        <p role="alert" className="mt-1.5 text-xs font-bold text-error">
          {captcha.error}
        </p>
      ) : null}
    </div>
  )
}
