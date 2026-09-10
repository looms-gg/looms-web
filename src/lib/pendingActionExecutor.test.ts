import { beforeEach, describe, expect, it, vi } from "vitest"
import { runPendingAction, type PendingActionDeps } from "./pendingActionExecutor"
import { clearPendingAction, setPendingAction } from "./pendingAction"

const mockLook = {
  id: "look-77",
  name: "Street Casual",
  stack: ["winter-coat"],
  bodyId: "body-4",
  bodyHue: 0,
  model: "classic" as const,
}

function makeDeps(overrides: Partial<PendingActionDeps> = {}): PendingActionDeps {
  return {
    owns: () => false,
    addToWardrobe: vi.fn().mockResolvedValue({ error: null }),
    wear: vi.fn(),
    addAndWear: vi.fn().mockResolvedValue({ error: null }),
    loadLook: vi.fn(),
    navigate: vi.fn(),
    getLook: vi.fn().mockResolvedValue(mockLook),
    ...overrides,
  }
}

describe("pendingActionExecutor", () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearPendingAction()
  })

  it("does nothing when no action is pending", async () => {
    const deps = makeDeps()
    await runPendingAction(deps)
    expect(deps.navigate).not.toHaveBeenCalled()
    expect(deps.addToWardrobe).not.toHaveBeenCalled()
    expect(deps.wear).not.toHaveBeenCalled()
    expect(deps.loadLook).not.toHaveBeenCalled()
  })

  it("replays openStudio as navigation to /studio", async () => {
    setPendingAction({ action: "openStudio" })
    const deps = makeDeps()
    await runPendingAction(deps)
    expect(deps.navigate).toHaveBeenCalledWith("/studio")
  })

  it("replays add as addToWardrobe without navigation", async () => {
    setPendingAction({ action: "add", pieceId: "winter-coat" })
    const deps = makeDeps()
    await runPendingAction(deps)
    expect(deps.addToWardrobe).toHaveBeenCalledWith("winter-coat")
    expect(deps.navigate).not.toHaveBeenCalled()
  })

  it("replays wear as wear when the piece is already owned", async () => {
    setPendingAction({ action: "wear", pieceId: "winter-coat" })
    const deps = makeDeps({ owns: () => true })
    await runPendingAction(deps)
    expect(deps.wear).toHaveBeenCalledWith("winter-coat")
    expect(deps.addAndWear).not.toHaveBeenCalled()
  })

  it("upgrades wear to addAndWear when the piece is not owned yet", async () => {
    setPendingAction({ action: "wear", pieceId: "winter-coat" })
    const deps = makeDeps({ owns: () => false })
    await runPendingAction(deps)
    expect(deps.addAndWear).toHaveBeenCalledWith("winter-coat")
    expect(deps.wear).not.toHaveBeenCalled()
  })

  it("replays addAndWear directly", async () => {
    setPendingAction({ action: "addAndWear", pieceId: "winter-coat" })
    const deps = makeDeps()
    await runPendingAction(deps)
    expect(deps.addAndWear).toHaveBeenCalledWith("winter-coat")
  })

  it("replays wearLook by loading the look and opening Studio", async () => {
    setPendingAction({ action: "wearLook", lookId: "look-77" })
    const deps = makeDeps()
    await runPendingAction(deps)
    expect(deps.getLook).toHaveBeenCalledWith("look-77")
    expect(deps.loadLook).toHaveBeenCalledWith(mockLook)
    expect(deps.navigate).toHaveBeenCalledWith("/studio")
  })

  it("silently drops wearLook when the look can no longer be fetched", async () => {
    setPendingAction({ action: "wearLook", lookId: "gone" })
    const deps = makeDeps({ getLook: vi.fn().mockResolvedValue(null) })
    await runPendingAction(deps)
    expect(deps.loadLook).not.toHaveBeenCalled()
    expect(deps.navigate).not.toHaveBeenCalled()
  })

  it("consumes the envelope so a second run is a no-op", async () => {
    setPendingAction({ action: "openStudio" })
    const deps = makeDeps()
    await runPendingAction(deps)
    await runPendingAction(deps)
    expect(deps.navigate).toHaveBeenCalledTimes(1)
  })

  it("swallows dependency failures instead of throwing", async () => {
    setPendingAction({ action: "add", pieceId: "winter-coat" })
    const deps = makeDeps({
      addToWardrobe: vi.fn().mockRejectedValue(new Error("network")),
    })
    await expect(runPendingAction(deps)).resolves.toBeUndefined()
  })
})
