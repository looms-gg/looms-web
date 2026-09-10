import { beforeEach, describe, expect, it } from "vitest"
import {
  clearPendingAction,
  consumePendingAction,
  peekPendingAction,
  setPendingAction,
} from "./pendingAction"

describe("pendingAction envelope", () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearPendingAction()
  })

  it("accepts the wearLook kind with a look id", () => {
    setPendingAction({ action: "wearLook", lookId: "look-77" })
    expect(peekPendingAction()).toMatchObject({
      action: "wearLook",
      lookId: "look-77",
    })
  })

  it("round-trips an action through sessionStorage", () => {
    setPendingAction({ action: "add", pieceId: "winter-coat" })

    const pending = peekPendingAction()
    expect(pending).toEqual({
      action: "add",
      pieceId: "winter-coat",
      createdAt: expect.any(Number),
    })
  })

  it("returns null when nothing is pending", () => {
    expect(peekPendingAction()).toBeNull()
  })

  it("expires stale actions after the TTL window", () => {
    setPendingAction({ action: "addAndWear", pieceId: "winter-coat" })

    // Simulate the envelope aging past the TTL.
    const raw = sessionStorage.getItem("looms_pending_action_v1")
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!) as { createdAt: number }
    parsed.createdAt = Date.now() - 20 * 60 * 1000 // 20 min ago, TTL is 15
    sessionStorage.setItem("looms_pending_action_v1", JSON.stringify(parsed))

    expect(peekPendingAction()).toBeNull()
    // Stale envelope is cleaned up, not left to rot.
    expect(consumePendingAction()).toBeNull()
  })

  it("consume returns the action exactly once", () => {
    setPendingAction({ action: "openStudio" })

    const first = consumePendingAction()
    expect(first?.action).toBe("openStudio")
    expect(consumePendingAction()).toBeNull()
    expect(peekPendingAction()).toBeNull()
  })

  it("consume preserves the piece id for replay", () => {
    setPendingAction({ action: "wear", pieceId: "knee-high-converse" })

    const consumed = consumePendingAction()
    expect(consumed).toMatchObject({
      action: "wear",
      pieceId: "knee-high-converse",
    })
  })

  it("treats corrupt storage as no pending action", () => {
    sessionStorage.setItem("looms_pending_action_v1", "{not json")
    expect(peekPendingAction()).toBeNull()
  })

  it("rejects envelopes with an unknown action kind", () => {
    sessionStorage.setItem(
      "looms_pending_action_v1",
      JSON.stringify({ action: "deleteEverything", createdAt: Date.now() }),
    )
    expect(peekPendingAction()).toBeNull()
  })

  it("rejects envelopes with non-string piece ids", () => {
    sessionStorage.setItem(
      "looms_pending_action_v1",
      JSON.stringify({ action: "add", pieceId: 42, createdAt: Date.now() }),
    )
    expect(peekPendingAction()).toBeNull()
  })

  it("clear removes a stored action", () => {
    setPendingAction({ action: "add", lookId: undefined, pieceId: "ash-crop" })
    clearPendingAction()
    expect(peekPendingAction()).toBeNull()
  })
})
