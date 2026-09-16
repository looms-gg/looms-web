// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.

import { DEFAULT_BODY_ID } from "../data/bodies";

// Constants
export const FLOOR_COLOR_LIGHT = "#D9E2E9";
export const FLOOR_COLOR_DARK = "#16181D";

// LocalStorage keys
export const OLD_LOCALSTORAGE_KEY = "rendererConfig_editor";
export const CURRENT_LOCALSTORAGE_KEY = "loomsEditorConfig_1";

// Types
export type Parts =
  | "head"
  | "body"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

export type Layers = "base" | "overlay";

export type PaintMode = "pixel" | "bulk" | "eraser" | "variation" | "dither";

// History snapshot for undo/redo
export interface HistorySnapshot {
  imageData: ImageData;
  skinIsSlim: boolean;
}

export type FormValues = {
  paintColor: string;
  paintAlpha: number;
  skinIsSlim: boolean;
  cameraPhi: number;
  cameraTheta: number;
  cameraRadius: number;
  cameraFieldOfView: number;
  ambientLight: number;
  directionalLightIntensity: number;
  colorPickerActive: boolean;
  paintMode: PaintMode;
  variationIntensity: number;
  bulkPaintRadius: number;
  bulkPaintShape: "square" | "circle";
  eraserRadius: number;
  mirrorPaint: boolean;
  baseheadVisible: boolean;
  basebodyVisible: boolean;
  baseleftArmVisible: boolean;
  baserightArmVisible: boolean;
  baseleftLegVisible: boolean;
  baserightLegVisible: boolean;
  overlayheadVisible: boolean;
  overlaybodyVisible: boolean;
  overlayleftArmVisible: boolean;
  overlayrightArmVisible: boolean;
  overlayleftLegVisible: boolean;
  overlayrightLegVisible: boolean;
  guideBodyVisible: boolean;
  guideBodyId: string;
};

// Numeric field ranges, carried over verbatim from MineSkin's zod schema.
// setValue clamps into these instead of rejecting, so a stale or hand-edited
// localStorage entry can never put a NaN or out-of-range value into the mesh.
export const NUMERIC_RANGES: {
  [K in keyof FormValues as FormValues[K] extends number ? K : never]: {
    min?: number;
    max?: number;
    int?: boolean;
  };
} = {
  cameraPhi: { min: -Math.PI / 2, max: Math.PI / 2 },
  cameraTheta: {},
  directionalLightIntensity: {},
  paintAlpha: { min: 0, max: 255 },
  cameraRadius: { min: 0 },
  cameraFieldOfView: { min: 0, max: Math.PI },
  ambientLight: { min: 0, max: 1 },
  variationIntensity: { min: 1, max: 6, int: true },
  bulkPaintRadius: { min: 0, max: 8 },
  eraserRadius: { min: 0, max: 8 },
};

export type FieldErrors = {
  [K in keyof FormValues]?: string;
};

// Persistable state (saved to localStorage)
export interface PersistableState extends FormValues {
  undoCount?: number;
  redoCount?: number;
}

// Full store state including history and UI state
export interface RendererStoreState extends FormValues {
  errors: FieldErrors;

  // History state (undo/redo)
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  batchInProgress: boolean;
  batchBaseline: HistorySnapshot | null;

}

// Store actions
export interface RendererStoreActions {
  setValue: <K extends keyof FormValues>(
    key: K,
    value: FormValues[K],
    origin?: string,
  ) => void;

  setAll: (values: Partial<FormValues>, origin?: string) => void;

  // History actions
  beginBatch: (imageData: ImageData, skinIsSlim: boolean) => void;
  endBatch: (imageData: ImageData, skinIsSlim: boolean) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  pushToUndoStack: (snapshot: HistorySnapshot) => void;
  clearHistory: () => void;

  // Persistence
  save: () => void;
  load: () => void;
  reset: () => void;

  // Touch drawing
}

// Combined store type
export type RendererStore = RendererStoreState & RendererStoreActions;

// Helper to get visibility key
export function getVisibilityKey(layer: Layers, part: Parts): keyof FormValues {
  return `${layer}${part}Visible` as keyof FormValues;
}

// Helper to check if paint overlay is active
export function getPaintOverlay(state: FormValues): boolean {
  return (
    state.overlayheadVisible ||
    state.overlaybodyVisible ||
    state.overlayleftArmVisible ||
    state.overlayrightArmVisible ||
    state.overlayleftLegVisible ||
    state.overlayrightLegVisible
  );
}

export const DEFAULT_GUIDE_BODY_ID = DEFAULT_BODY_ID;
