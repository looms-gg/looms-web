import { describe, expect, it } from "vitest"
import { applyHeroCameraPose } from "./heroPose"
import { PlayerObject } from "skinview3d"

describe("heroPose", () => {
  it("applies distinct camera poses for center, left, and right", () => {
    const player = new PlayerObject()

    // Center pose: forward-facing, arms relaxed, head tilted looking at camera
    applyHeroCameraPose(player, "center")
    expect(player.skin.head.rotation.z).toBeCloseTo(-0.04, 2)
    expect(player.skin.rightArm.rotation.z).toBeLessThan(0)
    expect(player.skin.leftArm.rotation.z).toBeGreaterThan(0)

    // Left pose: angled inward toward center/camera
    applyHeroCameraPose(player, "left")
    expect(player.skin.head.rotation.y).toBeLessThan(0)
    expect(player.skin.rightArm.rotation.x).toBeGreaterThan(0)

    // Right pose: angled inward toward center/camera
    applyHeroCameraPose(player, "right")
    expect(player.skin.head.rotation.y).toBeGreaterThan(0)
    expect(player.skin.rightArm.rotation.x).toBeGreaterThan(0)
    expect(player.skin.leftArm.rotation.z).toBeGreaterThan(0)
  })
})
