import { describe, it, expect } from "vitest"
import { createEditorHistory } from "./editorHistory"

describe("editorHistory", () => {
  function makeSnapshot(val: number): ImageData {
    const data = new Uint8ClampedArray(64 * 64 * 4)
    data[0] = val
    return { data, width: 64, height: 64 } as unknown as ImageData
  }

  it("pushes and undoes/redoes correctly", () => {
    const history = createEditorHistory(50)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)

    history.push(makeSnapshot(1))
    history.push(makeSnapshot(2))
    expect(history.canUndo()).toBe(true)

    const undone = history.undo(makeSnapshot(3))
    expect(undone?.data[0]).toBe(2)
    expect(history.canRedo()).toBe(true)

    const redone = history.redo(makeSnapshot(2))
    expect(redone?.data[0]).toBe(3)
  })

  it("clears redo stack when new stroke is pushed after undo", () => {
    const history = createEditorHistory(50)
    history.push(makeSnapshot(1))
    history.push(makeSnapshot(2))
    history.undo(makeSnapshot(3))
    expect(history.canRedo()).toBe(true)

    history.push(makeSnapshot(4))
    expect(history.canRedo()).toBe(false)
  })

  it("enforces maximum history size limit", () => {
    const history = createEditorHistory(3)
    history.push(makeSnapshot(1))
    history.push(makeSnapshot(2))
    history.push(makeSnapshot(3))
    history.push(makeSnapshot(4))
    // Can only undo 3 steps back
    expect(history.undo(makeSnapshot(5))?.data[0]).toBe(4)
    expect(history.undo(makeSnapshot(4))?.data[0]).toBe(3)
    expect(history.undo(makeSnapshot(3))?.data[0]).toBe(2)
    expect(history.canUndo()).toBe(false)
  })
})

