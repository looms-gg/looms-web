import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Warning } from "@phosphor-icons/react"
import { supabase } from "../../lib/supabase"
import { takeOAuthReturn } from "../../lib/auth/oauth"
import { Icon } from "../../components/ui/Icon"
import { LoomsLogo } from "../../components/ui/LoomsLogo"

const SESSION_WAIT_ATTEMPTS = 10
const SESSION_WAIT_MS = 250
const AUTH_CALLBACK_ERROR_MESSAGE = "We didn't finish connecting that account. You can try again."

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollForSession(): Promise<boolean> {
  for (let attempt = 0; attempt < SESSION_WAIT_ATTEMPTS; attempt++) {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      return true
    }
    await delay(SESSION_WAIT_MS)
  }
  return false
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    let cancelled = false
    if (searchParams.get("error") || searchParams.get("error_code")) {
      setError(AUTH_CALLBACK_ERROR_MESSAGE)
      return
    }

    void pollForSession().then((hasSession) => {
      if (cancelled) return
      if (hasSession) {
        navigateRef.current(takeOAuthReturn())
      } else {
        setError(AUTH_CALLBACK_ERROR_MESSAGE)
      }
    })

    return () => {
      cancelled = true
    }
  }, [searchParams])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <LoomsLogo variant="wordmark" className="h-8" decorative />
      {error ? (
        <>
          <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-error">
            <Icon icon={Warning} size="sm" />
            {error}
          </p>
          <Link to="/" className="btn btn-primary btn-sm rounded-full font-extrabold">
            Back to looms
          </Link>
        </>
      ) : (
        <span className="loading loading-spinner loading-lg text-primary" aria-busy="true" />
      )}
    </div>
  )
}
