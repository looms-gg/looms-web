const STORAGE_KEY = "looms_pending_action_v1"
const TTL_MS = 15 * 60 * 1000

export type PendingActionKind =
  | "add"
  | "wear"
  | "addAndWear"
  | "openStudio"
  | "wearLook"

export interface PendingAction {
  action: PendingActionKind
  pieceId?: string
  lookId?: string
  createdAt: number
}

const ACTION_KINDS: readonly PendingActionKind[] = [
  "add",
  "wear",
  "addAndWear",
  "openStudio",
  "wearLook",
]

function isPendingAction(value: unknown): value is PendingAction {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<PendingAction>
  if (!candidate.action || !ACTION_KINDS.includes(candidate.action)) return false
  if (candidate.pieceId !== undefined && typeof candidate.pieceId !== "string") {
    return false
  }
  if (candidate.lookId !== undefined && typeof candidate.lookId !== "string") {
    return false
  }
  if (typeof candidate.createdAt !== "number" || !Number.isFinite(candidate.createdAt)) {
    return false
  }
  return true
}

function readRaw(): unknown {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "")
  } catch {
    return null
  }
}

function writeRaw(action: PendingAction) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action))
  } catch {
    // Storage unavailable (private mode etc.) — resume just won't happen.
  }
}

export function setPendingAction(input: Omit<PendingAction, "createdAt">) {
  writeRaw({ ...input, createdAt: Date.now() })
}

export function clearPendingAction() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Read the pending action without consuming it. Expired or corrupt entries return null. */
export function peekPendingAction(): PendingAction | null {
  let parsed: unknown
  try {
    parsed = readRaw()
  } catch {
    return null
  }
  if (!isPendingAction(parsed)) {
    if (parsed !== null) clearPendingAction()
    return null
  }
  if (Date.now() - parsed.createdAt > TTL_MS) {
    clearPendingAction()
    return null
  }
  return parsed
}

/** Take the pending action out of storage. Returns null when nothing (valid) is pending. */
export function consumePendingAction(): PendingAction | null {
  const pending = peekPendingAction()
  if (pending) clearPendingAction()
  return pending
}
