import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { HeroBlocks, heroBlocks } from "./HeroBlocks"

function overlaps(
  a: { x: number; y: number; side: number },
  b: { x: number; y: number; side: number },
) {
  return a.x < b.x + b.side && b.x < a.x + a.side && a.y < b.y + b.side && b.y < a.y + a.side
}

describe("heroBlocks", () => {
  it("is deterministic across calls", () => {
    expect(heroBlocks()).toEqual(heroBlocks())
  })

  it("changes with the seed", () => {
    expect(heroBlocks(1)).not.toEqual(heroBlocks(2))
  })

  it("keeps every block on-canvas and non-overlapping", () => {
    const blocks = heroBlocks()
    expect(blocks.length).toBeGreaterThan(20)

    for (const block of blocks) {
      expect(block.side).toBeGreaterThan(0)
      expect(block.x).toBeGreaterThanOrEqual(0)
      expect(block.y).toBeGreaterThanOrEqual(0)
      expect(block.x + block.side).toBeLessThanOrEqual(1400)
      expect(block.y + block.side).toBeLessThanOrEqual(420)
      expect(block.opacity).toBeGreaterThanOrEqual(0.05)
      expect(block.opacity).toBeLessThanOrEqual(0.13)
    }

    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        expect(overlaps(blocks[i], blocks[j])).toBe(false)
      }
    }
  })
})

describe("HeroBlocks", () => {
  it("renders one rect per block inside a hidden overlay", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<HeroBlocks />)
    })

    const container = host.querySelector(".hero-blocks-container") as HTMLElement
    expect(container).toBeTruthy()
    expect(container.getAttribute("aria-hidden")).toBe("true")
    expect(container.querySelectorAll("rect").length).toBe(heroBlocks().length)
  })
})
