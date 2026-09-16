import { describe, expect, it } from "vitest";
import { hasPaintedPixelsData, suggestSlot } from "./saveExport";

// happy-dom does not implement canvas 2D rasterization, so the pixel scan is
// tested on the pure data function (same code path the canvas wrapper uses).
function alphaData(alphaAt: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(64 * 64 * 4);
  for (const i of alphaAt) data[i * 4 + 3] = 255;
  return data;
}

describe("hasPaintedPixelsData", () => {
  it("detects a blank layer", () => {
    expect(hasPaintedPixelsData(alphaData([]))).toBe(false);
  });

  it("detects any painted pixel", () => {
    expect(hasPaintedPixelsData(alphaData([100]))).toBe(true);
  });
});

describe("suggestSlot", () => {
  it("suggests head slots for head-only paint", () => {
    expect(suggestSlot(["head"])).toBe("hair");
  });

  it("suggests shirt for torso", () => {
    expect(suggestSlot(["torso"])).toBe("shirt");
  });

  it("suggests pants for legs", () => {
    expect(suggestSlot(["legs"])).toBe("pants");
  });

  it("suggests set for torso+legs", () => {
    expect(suggestSlot(["torso", "legs"])).toBe("set");
  });

  it("falls back to shirt when nothing is painted", () => {
    expect(suggestSlot([])).toBe("shirt");
  });
});
