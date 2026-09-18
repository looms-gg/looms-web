import { useCallback, useMemo, useState } from "react"
import type { EditorControls } from "./editorControls"

export type EditorBrushData = Pick<
  EditorControls,
  | "tool"
  | "brushSize"
  | "brushShape"
  | "brushOpacity"
  | "brushSoftness"
  | "brushBlend"
  | "shadingMode"
  | "bucketMode"
  | "shapeKind"
  | "shapeFill"
  | "symmetry"
  | "gridVisible"
>

export interface EditorBrushState {
  data: EditorBrushData
  patch: (p: Partial<EditorBrushData>) => void
}

export function useEditorBrush(): EditorBrushState {
  const [data, setData] = useState<EditorBrushData>({
    tool: "pencil",
    brushSize: 1,
    brushShape: "square",
    brushOpacity: 1,
    brushSoftness: 0,
    brushBlend: "normal",
    shadingMode: "lighten",
    bucketMode: "connectedColors",
    shapeKind: "rectangle",
    shapeFill: "filled",
    symmetry: false,
    gridVisible: true,
  })

  const patch = useCallback((p: Partial<EditorBrushData>) => {
    setData((prev) => ({ ...prev, ...p }))
  }, [])

  // Stable while the brush data is unchanged, so memoized panels that receive
  // the brush slice skip re-renders on unrelated state (colors, visibility).
  return useMemo(() => ({ data, patch }), [data, patch])
}
