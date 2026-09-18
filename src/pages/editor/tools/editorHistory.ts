export interface EditorHistory {
  push(snapshot: ImageData): void
  undo(current: ImageData): ImageData | null
  redo(current: ImageData): ImageData | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

// Snapshots are handed off, not copied: every caller passes a freshly captured
// ImageData it never mutates afterwards (the history owns it). This keeps one
// 16KB copy per step instead of two.
export function createEditorHistory(maxSize = 50): EditorHistory {
  let undoStack: ImageData[] = []
  let redoStack: ImageData[] = []

  return {
    push(snapshot: ImageData) {
      undoStack.push(snapshot)
      if (undoStack.length > maxSize) {
        undoStack.shift()
      }
      redoStack = []
    },
    undo(current: ImageData): ImageData | null {
      if (undoStack.length === 0) return null
      const target = undoStack.pop()!
      redoStack.push(current)
      return target
    },
    redo(current: ImageData): ImageData | null {
      if (redoStack.length === 0) return null
      const target = redoStack.pop()!
      undoStack.push(current)
      return target
    },
    canUndo(): boolean {
      return undoStack.length > 0
    },
    canRedo(): boolean {
      return redoStack.length > 0
    },
    clear() {
      undoStack = []
      redoStack = []
    },
  }
}

