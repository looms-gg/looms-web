import { consumePendingAction } from "./pendingAction"
import type { Look } from "../state/persist"

export interface PendingActionDeps {
  owns: (pieceId: string) => boolean
  addToWardrobe: (pieceId: string) => Promise<unknown>
  wear: (pieceId: string) => void
  addAndWear: (pieceId: string) => Promise<unknown>
  loadLook: (look: Look) => void
  getLook: (lookId: string) => Promise<Look | null>
  navigate: (path: string) => void
}

/**
 * Consume and execute the pending post-auth action, if any. Best-effort by
 * design: a stale piece, a deleted look, or a network failure must never
 * break the moment right after someone signs in.
 */
export async function runPendingAction(deps: PendingActionDeps): Promise<void> {
  const pending = consumePendingAction()
  if (!pending) return
  try {
    switch (pending.action) {
      case "openStudio":
        deps.navigate("/studio")
        return
      case "add":
        if (pending.pieceId) await deps.addToWardrobe(pending.pieceId)
        return
      case "wear":
        // The guest wardrobe is wiped on sign-in, so "wear" usually means the
        // piece needs adding first; addAndWear is dup-safe.
        if (pending.pieceId && deps.owns(pending.pieceId)) {
          deps.wear(pending.pieceId)
        } else if (pending.pieceId) {
          await deps.addAndWear(pending.pieceId)
        }
        return
      case "addAndWear":
        if (pending.pieceId) await deps.addAndWear(pending.pieceId)
        return
      case "wearLook": {
        if (!pending.lookId) return
        const look = await deps.getLook(pending.lookId)
        if (!look) return
        deps.loadLook(look)
        deps.navigate("/studio")
        return
      }
    }
  } catch {
    // Swallow: replay is a convenience, not a contract.
  }
}
