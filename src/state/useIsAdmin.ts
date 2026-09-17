import { useEffect, useState } from "react"
import { useAuthOptional } from "./auth"
import { supabase } from "../lib/supabase"

/**
 * Server-derived admin flag: RLS lets admins see admin_users, so a probe
 * for the caller's own id resolves to a row only for admins. The client
 * copy is a convenience for UI (menu entries, guards); every privileged
 * action is still gated server-side.
 */
export function useIsAdmin(): boolean {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle()
        if (!cancelled) setIsAdmin(Boolean(data))
      } catch {
        if (!cancelled) setIsAdmin(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  return isAdmin
}
