import { useEffect, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuthOptional } from "../../state/auth"
import { useCloset } from "../../state/closet"
import { fetchLookById, publicLookToLook } from "../../state/publicLooks"
import { clearPendingAction } from "../../lib/pendingAction"
import { runPendingAction } from "../../lib/pendingActionExecutor"

/**
 * Replays the action a guest saved before signing in (piece add/wear, look
 * wear, studio open) once they have a confirmed session. Covers three paths
 * with one transition check: password login, the "You're in" verification
 * flip, and magic-link redirects that restore the session in a fresh tab.
 * Never fires on sign-out, and never fires for unconfirmed sessions whose
 * server writes would fail.
 */
export function usePendingActionReplay() {
  const auth = useAuthOptional()
  const closet = useCloset()
  const navigate = useNavigate()
  const location = useLocation()

  const closetRef = useRef(closet)
  closetRef.current = closet
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const locationRef = useRef(location)
  locationRef.current = location

  const authKey =
    auth && !auth.loading
      ? `${auth.user?.id ?? "none"}:${auth.emailVerified ? "verified" : "unverified"}`
      : undefined
  const prevKeyRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (authKey === undefined) return
    const prev = prevKeyRef.current
    prevKeyRef.current = authKey
    if (prev === authKey) return

    const [userIdPart, verifiedPart] = authKey.split(":")
    // Sign-out: drop any saved intent so it can never replay on a later,
    // unrelated sign-in.
    if (userIdPart === "none") {
      if (prev !== undefined) clearPendingAction()
      return
    }
    if (verifiedPart !== "verified") return

    void runPendingAction({
      owns: (pieceId) => closetRef.current.owns(pieceId),
      addToWardrobe: (pieceId) => closetRef.current.addToWardrobe(pieceId),
      wear: (pieceId) => closetRef.current.wear(pieceId),
      addAndWear: (pieceId) => closetRef.current.addAndWear(pieceId),
      loadLook: (look) => closetRef.current.loadLook(look),
      getLook: async (lookId) => {
        const publicLook = await fetchLookById(lookId)
        return publicLook ? publicLookToLook(publicLook) : null
      },
      navigate: (path) => navigateRef.current(path, { state: { from: locationRef.current.pathname } }),
    })
  }, [authKey])
}
