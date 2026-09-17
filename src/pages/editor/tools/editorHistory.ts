export interface EditorHistory {
  push(snapshot: ImageData): void
  undo(current: ImageData): ImageData | null
  redo(current: ImageData): ImageData | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

export function createEditorHistory(maxSize = 50): EditorHistory {
  let undoStack: ImageData[] = []
  let redoStack: ImageData[] = []

  function cloneImageData(img: ImageData): ImageData {
    const copy = new Uint8ClampedArray(img.data)
    if (typeof ImageData !== "undefined") {
      return new ImageData(copy, img.width, img.height)
    }
    return { data: copy, width: img.width, height: img.height } as unknown as ImageData
  }

  return {
    push(snapshot: ImageData) {
      undoStack.push(cloneImageData(snapshot))
      if (undoStack.length > maxSize) {
        undoStack.shift()
      }
      redoStack = []
    },
    undo(current: ImageData): ImageData | null {
      if (undoStack.length === 0) return null
      const target = undoStack.pop()!
      redoStack.push(cloneImageData(current))
      return target
    },
    redo(current: ImageData): ImageData | null {
      if (redoStack.length === 0) return null
      const target = redoStack.pop()!
      undoStack.push(cloneImageData(current))
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

