import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Warning } from "@phosphor-icons/react"
import { supabase } from "../../lib/supabase"
import { takeOAuthReturn } from "../../lib/oauth"
import { Icon } from "../../components/ui/Icon"
import { LoomsLogo } from "../../components/ui/LoomsLogo"

const SESSION_WAIT_ATTEMPTS = 10
const SESSION_WAIT_MS = 250

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useEffect(() => {
    let cancelled = false
    if (searchParams.get("error") || searchParams.get("error_code")) {
      setError("We didn't finish connecting that account. You can try again.")
      return
    }

    async function waitForSession() {
      for (let attempt = 0; attempt < SESSION_WAIT_ATTEMPTS; attempt++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          if (!cancelled) navigateRef.current(takeOAuthReturn())
          return
        }
        await new Promise((resolve) => setTimeout(resolve, SESSION_WAIT_MS))
      }
      if (!cancelled) setError("We didn't finish connecting that account. You can try again.")
    }
    void waitForSession()
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
