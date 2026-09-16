import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRendererState,
  selectPaintOverlay,
  selectRedoCount,
  selectUndoCount,
  subscribeToRenderer,
  type HistorySnapshot,
} from "./store";

function snapshot(): HistorySnapshot {
  const imageData = new ImageData(64, 64);
  const material = {
    imageData,
    width: 64,
    clone: () => material,
  };
  return { material: material as never, skinIsSlim: false };
}

describe("renderer store", () => {
  beforeEach(() => {
    const state = getRendererState();
    state.clearHistory();
    state.reset();
    localStorage.removeItem("loomsEditorConfig_1");
  });

  it("starts with a classic model, pixel brush, and visible guide body", () => {
    const state = getRendererState();
    expect(state.skinIsSlim).toBe(false);
    expect(state.paintMode).toBe("pixel");
    expect(state.guideBodyVisible).toBe(true);
    expect(typeof state.guideBodyId).toBe("string");
    expect((state as unknown as Record<string, unknown>).skinIsDoubleRes).toBeUndefined();
    expect((state as unknown as Record<string, unknown>).poseMode).toBeUndefined();
  });

  it("clamps numeric fields into their allowed ranges", () => {
    getRendererState().setValue("paintAlpha", 999);
    expect(getRendererState().paintAlpha).toBeLessThanOrEqual(255);
    getRendererState().setValue("bulkPaintRadius", -3);
    expect(getRendererState().bulkPaintRadius).toBeGreaterThanOrEqual(0);
  });

  it("tracks undo/redo counts across snapshots", () => {
    const state = getRendererState();
    state.pushToUndoStack(snapshot());
    state.pushToUndoStack(snapshot());
    expect(selectUndoCount(getRendererState())).toBe(1);
    const undone = state.undo();
    expect(undone).not.toBeNull();
    expect(selectRedoCount(getRendererState())).toBe(1);
  });

  it("paint overlay selector reflects any overlay part", () => {
    const state = getRendererState();
    for (const key of [
      "overlayheadVisible",
      "overlaybodyVisible",
      "overlayleftArmVisible",
      "overlayrightArmVisible",
      "overlayleftLegVisible",
      "overlayrightLegVisible",
    ] as const) {
      state.setValue(key, false);
    }
    expect(selectPaintOverlay(getRendererState())).toBe(false);
    state.setValue("overlayheadVisible", true);
    expect(selectPaintOverlay(getRendererState())).toBe(true);
  });

  it("persists changed values to localStorage through save/load", () => {
    getRendererState().setValue("paintColor", "#ff0000");
    getRendererState().save();
    const stored = JSON.parse(
      localStorage.getItem("loomsEditorConfig_1") ?? "{}",
    );
    expect(stored.paintColor).toBe("#FF0000");
  });

  it("loads persisted values from localStorage", () => {
    localStorage.setItem(
      "loomsEditorConfig_1",
      JSON.stringify({ paintColor: "#123456", mirrorPaint: true }),
    );
    getRendererState().load();
    expect(getRendererState().paintColor).toBe("#123456");
    expect(getRendererState().mirrorPaint).toBe(true);
  });

  it("notifies subscribers on changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToRenderer(listener);
    getRendererState().setValue("mirrorPaint", true);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("undo returns null with a single snapshot", () => {
    getRendererState().pushToUndoStack(snapshot());
    expect(getRendererState().undo()).toBeNull();
  });
});
