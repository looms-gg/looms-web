import {
  Eraser,
  Eyedropper,
  PaintBucket,
  Pencil,
  Sparkle,
  SquareHalf,
  Sun,
} from "@phosphor-icons/react"
import type { IconType } from "../../../components/ui/Icon"
import type { EditorTool } from "./editorControls"

export interface EditorToolDef {
  id: EditorTool
  label: string
  shortcut: string
  icon: IconType
}

export const EDITOR_TOOL_DEFS: EditorToolDef[] = [
  { id: "pencil", label: "Pen", shortcut: "P", icon: Pencil },
  { id: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
  { id: "bucket", label: "Bucket", shortcut: "B", icon: PaintBucket },
  { id: "shading", label: "Shading", shortcut: "S", icon: Sun },
  { id: "shape", label: "Shape", shortcut: "U", icon: SquareHalf },
  { id: "noise", label: "Noise", shortcut: "N", icon: Sparkle },
  { id: "picker", label: "Dropper", shortcut: "I", icon: Eyedropper },
]
