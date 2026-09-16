// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.

import { getRendererState } from "../store";
import type { HistorySnapshot } from "../types";
import { MiSkiRenderer } from "./MiSkiRenderer";

export class UndoRedoManager {
  private boundOnKeyDown = (e: KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey; // support Ctrl (Windows/Linux) and Cmd (macOS)
    if (isMod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if (isMod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      this.redo();
    }
  };

  public renderer: MiSkiRenderer;

  constructor(renderer: MiSkiRenderer) {
    this.renderer = renderer;
  }

  public beginBatch() {
    const skin = this.renderer.getMainSkin();
    const state = getRendererState();
    state.beginBatch(skin.material, state.skinIsSlim);
  }

  public endBatch() {
    const skin = this.renderer.getMainSkin();
    const state = getRendererState();
    state.endBatch(skin.material, state.skinIsSlim);
  }

  private async applySnapshot(snapshot: HistorySnapshot) {
    const skin = this.renderer.getMainSkin();
    skin.material = snapshot.material.clone();
  }

  public async undo() {
    if (this.renderer.getMode() === "Preview") {
      return;
    }
    const state = getRendererState();
    const prev = state.undo();
    if (prev) {
      await this.applySnapshot(prev);
    }
  }

  public async redo() {
    if (this.renderer.getMode() === "Preview") {
      return;
    }
    const state = getRendererState();
    const next = state.redo();
    if (next) {
      await this.applySnapshot(next);
    }
  }

  public mountListeners() {
    document.addEventListener("keydown", this.boundOnKeyDown);

    // Push initial state to undo stack
    const skin = this.renderer.getMainSkin();
    const state = getRendererState();
    state.pushToUndoStack({
      material: skin.material.clone(),
      skinIsSlim: state.skinIsSlim,
    });
  }

  public unmountListeners() {
    document.removeEventListener("keydown", this.boundOnKeyDown);
  }

  public reset() {
    getRendererState().clearHistory();
  }
}
