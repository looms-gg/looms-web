const VIEW_W = 1400
const VIEW_H = 420
const COLS = 14
const ROWS = 6
const SEED = 0x10c0531

export type HeroBlock = { x: number; y: number; side: number; opacity: number }

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Scattered pixel blocks for the hero backdrop. Each occupied grid cell holds
 * exactly one block sized to fit inside that cell, so overlap is impossible by
 * construction. Seeded, so the scatter is stable across renders and tests.
 */
export function heroBlocks(seed = SEED): HeroBlock[] {
  const rand = mulberry32(seed)
  const cellW = VIEW_W / COLS
  const cellH = VIEW_H / ROWS
  const maxSide = Math.min(cellW, cellH)
  const blocks: HeroBlock[] = []

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (rand() < 0.42) continue
      const side = maxSide * (0.34 + rand() * 0.62)
      blocks.push({
        x: col * cellW + rand() * (cellW - side),
        y: row * cellH + rand() * (cellH - side),
        side,
        opacity: 0.05 + rand() * 0.08,
      })
    }
  }

  return blocks
}

export function HeroBlocks() {
  return (
    <div className="hero-blocks-container" aria-hidden="true">
      <svg
        className="hero-blocks-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        {heroBlocks().map((block, i) => (
          <rect
            key={i}
            x={block.x}
            y={block.y}
            width={block.side}
            height={block.side}
            opacity={block.opacity}
          />
        ))}
      </svg>
    </div>
  )
}
