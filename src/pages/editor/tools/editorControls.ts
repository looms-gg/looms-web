import type { SkinModel } from "../../../skin/convert"
import type { Piece } from "../../../data/catalog"
import type {
  BrushBlendMode,
  BrushShape,
  BucketMode,
  ShapeFillMode,
} from "./editorTools"

export type EditorTool =
  | "pencil"
  | "eraser"
  | "bucket"
  | "shading"
  | "noise"
  | "shape"
  | "picker"

export type PaintSession = { kind: "fresh" } | { kind: "piece"; piece: Piece }

export type ShadingMode = "lighten" | "darken"
export type ShapeKind = "rectangle" | "ellipse"

export type LimbId =
  | "head"
  | "body"
  | "rightArm"
  | "leftArm"
  | "rightLeg"
  | "leftLeg"

export interface EditorControls {
  model: SkinModel
  tool: EditorTool
  brushSize: number
  brushShape: BrushShape
  brushOpacity: number
  brushSoftness: number
  brushBlend: BrushBlendMode
  shadingMode: ShadingMode
  bucketMode: BucketMode
  shapeKind: ShapeKind
  shapeFill: ShapeFillMode
  symmetry: boolean
  primaryColor: string
  secondaryColor: string
  recentColors: string[]
  bodyParts: Record<LimbId, boolean>
  armorParts: Record<LimbId, boolean>
  gridVisible: boolean
}
