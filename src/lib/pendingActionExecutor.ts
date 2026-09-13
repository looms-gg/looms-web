import { consumePendingAction } from "./pendingAction"
import type { Look } from "../data/look"

export interface PendingActionDeps {
  owns: (pieceId: string) => boolean
  addToWardrobe: (pieceId: string, options?: { notify?: boolean }) => Promise<unknown>
  wear: (pieceId: string, options?: { notify?: boolean }) => void
  addAndWear: (pieceId: string, options?: { notify?: boolean }) => Promise<unknown>
  loadLook: (look: Look, options?: { notify?: boolean }) => void
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
        if (pending.pieceId) await deps.addToWardrobe(pending.pieceId, { notify: false })
        return
      case "wear":
        // The guest wardrobe is wiped on sign-in, so "wear" usually means the
        // piece needs adding first; addAndWear is dup-safe.
        if (pending.pieceId && deps.owns(pending.pieceId)) {
          deps.wear(pending.pieceId, { notify: false })
        } else if (pending.pieceId) {
          await deps.addAndWear(pending.pieceId, { notify: false })
        }
        return
      case "addAndWear":
        if (pending.pieceId) await deps.addAndWear(pending.pieceId, { notify: false })
        return
      case "wearLook": {
        if (!pending.lookId) return
        const look = await deps.getLook(pending.lookId)
        if (!look) return
        deps.loadLook(look, { notify: false })
        deps.navigate("/studio")
        return
      }
    }
  } catch {
    // Swallow: replay is a convenience, not a contract.
  }
}
