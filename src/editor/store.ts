// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
import { useEffect } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
  CURRENT_LOCALSTORAGE_KEY,
  DEFAULT_GUIDE_BODY_ID,
  FLOOR_COLOR_DARK,
  FLOOR_COLOR_LIGHT,
  NUMERIC_RANGES,
  OLD_LOCALSTORAGE_KEY,
  getPaintOverlay,
  type FormValues,
  type HistorySnapshot,
  type Layers,
  type Parts,
  type PersistableState,
  type RendererStore,
} from "./types";
import { MAX_VARIATION_STEPS } from "./core/utils";
import { throttle } from "./throttle";

// One-time "your tools moved into the brush slot" hint for returning users.
export const BRUSH_INTRO_HINT_KEY = "brush-intro-hint-dismissed";

// Check if window is defined (SSR safety)
const definedWindow = typeof window !== "undefined";

// Convert degrees to radians
function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

// Default values for all form fields
export const defaultFormValues: FormValues = {
  objectTranslationX: 0,
  objectTranslationY: 0,
  objectTranslationZ: 0,
  objectRotationX: 0,
  objectRotationY: 0,
  objectRotationZ: 0,
  cameraFieldOfView: degToRad(60),
  cameraPhi: 0,
  cameraTheta: 0,
  cameraRadius: 35,
  cameraSpeed: 0.08,
  cameraDampingFactor: 0.1,
  ambientLight: 1,
  diffuseLightPositionX: -10,
  diffuseLightPositionY: 10,
  diffuseLightPositionZ: 10,
  specularStrength: 0.05,
  diffuseStrength: 0.6,
  paintColor: "#000000",
  paintAlpha: 255,
  floorColor: isLoomsDark() ? FLOOR_COLOR_DARK : FLOOR_COLOR_LIGHT,
  skinIsSlim: false,
  colorPickerActive: false,
  touchDrawMode: false,
  paintMode: "pixel",
  variationIntensity: 3,
  bulkPaintRadius: 0,
  bulkPaintShape: "circle",
  eraserRadius: 0,
  mirrorPaint: false,
  directionalLightIntensity: 0.3,
  baseheadVisible: true,
  basebodyVisible: true,
  baseleftArmVisible: true,
  baserightArmVisible: true,
  baseleftLegVisible: true,
  baserightLegVisible: true,
  overlayheadVisible: true,
  overlaybodyVisible: true,
  overlayleftArmVisible: true,
  overlayrightArmVisible: true,
  overlayleftLegVisible: true,
  overlayrightLegVisible: true,
  mode: "Editing",
  gridVisible: false,
  environmentPreset: "grid",
  guideBodyVisible: true,
  guideBodyId: DEFAULT_GUIDE_BODY_ID,
};

// looms ships its own two daisyUI themes instead of MineSkin's `.dark` toggle.
function isLoomsDark(): boolean {
  if (!definedWindow) return true;
  return document.documentElement.getAttribute("data-theme") !== "looms-light";
}

function clampNumericValue(
  key: keyof FormValues,
  value: number,
): number | undefined {
  const range = NUMERIC_RANGES[key as keyof typeof NUMERIC_RANGES];
  if (!range) return value;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  let clamped = value;
  if (range.int) clamped = Math.round(clamped);
  if (range.min !== undefined) clamped = Math.max(range.min, clamped);
  if (range.max !== undefined) clamped = Math.min(range.max, clamped);
  return clamped;
}

// Parse saved state from localStorage
function parseStringState(config: string): Partial<FormValues> {
  try {
    return JSON.parse(config) as Partial<FormValues>;
  } catch (error) {
    console.error("Failed to parse state:", error);
    return {};
  }
}

// Migrate persisted config from older schema versions.
function migrateConfig(config: Partial<FormValues>): Partial<FormValues> {
  let migrated = config;

  // The "plain" environment preset was renamed to "grid"; map it so existing
  // users keep their grid floor.
  if ((migrated.environmentPreset as string) === "plain") {
    migrated = { ...migrated, environmentPreset: "grid" };
  }

  // variationIntensity used to be a 0..1 fraction; it's now a discrete rung
  // count (1..MAX_VARIATION_STEPS). Legacy configs stored fractional values, so
  // rescale those onto the rung ladder. There is no "off" rung anymore, so
  // saved zeros (fractional-era or early rung-era) are bumped to 1.
  const vi = migrated.variationIntensity;
  if (typeof vi === "number" && vi < 1) {
    migrated = {
      ...migrated,
      variationIntensity: Math.max(1, Math.round(vi * MAX_VARIATION_STEPS)),
    };
  }

  return migrated;
}

// Check if two ImageData objects are equal
function areImageDataEqual(a: ImageData, b: ImageData): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] !== b.data[i]) return false;
  }
  return true;
}

// Keys persisted to localStorage, verbatim from MineSkin minus pose,
// double-resolution, and tutorial keys, plus the guide-body pair.
const PERSISTED_KEYS: (keyof FormValues)[] = [
  "objectTranslationX",
  "objectTranslationY",
  "objectTranslationZ",
  "objectRotationX",
  "objectRotationY",
  "objectRotationZ",
  "cameraFieldOfView",
  "cameraPhi",
  "cameraTheta",
  "cameraRadius",
  "cameraSpeed",
  "cameraDampingFactor",
  "ambientLight",
  "diffuseLightPositionX",
  "diffuseLightPositionY",
  "diffuseLightPositionZ",
  "specularStrength",
  "diffuseStrength",
  "paintColor",
  "paintAlpha",
  "floorColor",
  "skinIsSlim",
  "colorPickerActive",
  "touchDrawMode",
  "paintMode",
  "variationIntensity",
  "bulkPaintRadius",
  "bulkPaintShape",
  "eraserRadius",
  "mirrorPaint",
  "directionalLightIntensity",
  "baseheadVisible",
  "basebodyVisible",
  "baseleftArmVisible",
  "baserightArmVisible",
  "baseleftLegVisible",
  "baserightLegVisible",
  "overlayheadVisible",
  "overlaybodyVisible",
  "overlayleftArmVisible",
  "overlayrightArmVisible",
  "overlayleftLegVisible",
  "overlayrightLegVisible",
  "mode",
  "gridVisible",
  "environmentPreset",
  "guideBodyVisible",
  "guideBodyId",
];

const createRendererStore = () =>
  createStore<RendererStore>()((set, get) => {
    // Shared write routine behind the throttled auto-save and the explicit save()
    const persistNow = () => {
      const state = get();
      const persistableState: Partial<PersistableState> = {};
      for (const key of PERSISTED_KEYS) {
        persistableState[key] = state[key] as never;
      }
      localStorage.setItem(
        CURRENT_LOCALSTORAGE_KEY,
        JSON.stringify(persistableState),
      );
    };

    // Throttled save function
    const throttledSave = throttle(persistNow, 500);

    // Flush any pending throttled save before the page unloads so we
    // never lose recent state changes (e.g. part-filter toggles).
    if (definedWindow) {
      window.addEventListener("beforeunload", () => {
        throttledSave.flush();
      });
    }

    return {
      // Form values (flat, not nested)
      ...defaultFormValues,

      // Validation errors
      errors: {},

      // History state
      undoStack: [],
      redoStack: [],
      batchInProgress: false,
      batchBaseline: null,

      // Touch drawing state (runtime flag, not persisted)
      touchDrawActive: false,

      // Actions

      setValue: (key, value, _origin) => {
        let finalValue = value;

        if (typeof value === "number" || typeof value === "string") {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            const clamped = clampNumericValue(key, parsed);
            if (clamped === undefined) return;
            finalValue = clamped as FormValues[typeof key];
          }
        }

        // Uppercase paint color
        if (key === "paintColor" && typeof finalValue === "string") {
          finalValue = finalValue.toUpperCase() as FormValues[typeof key];
        }

        set((state) => {
          const hadError = state.errors[key] !== undefined;
          return {
            [key]: finalValue,
            ...(hadError
              ? { errors: { ...state.errors, [key]: undefined } }
              : null),
          };
        });

        // Auto-save on successful change
        throttledSave();
      },

      setAll: (values, _origin) => {
        const updates: Partial<FormValues> = {};

        for (const [key, value] of Object.entries(values)) {
          if (value !== undefined) {
            // Uppercase paint color
            if (key === "paintColor" && typeof value === "string") {
              updates[key as keyof FormValues] = value.toUpperCase() as never;
            } else {
              updates[key as keyof FormValues] = value as never;
            }
          }
        }

        set(updates);
      },

      setError: (key: keyof FormValues, error: string | undefined) => {
        set((state) => {
          if (state.errors[key] === error) return {};
          return { errors: { ...state.errors, [key]: error } };
        });
      },

      clearErrors: () => {
        set({ errors: {} });
      },

      // History actions
      beginBatch: (material, skinIsSlim) => {
        const state = get();
        if (!state.batchInProgress) {
          set({
            batchInProgress: true,
            batchBaseline: {
              material: material.clone(),
              skinIsSlim,
            },
          });
        }
      },

      endBatch: (material, skinIsSlim) => {
        const state = get();
        if (!state.batchInProgress) return;

        const snapshot: HistorySnapshot = {
          material: material.clone(),
          skinIsSlim,
        };

        const baseline = state.batchBaseline;
        if (
          baseline &&
          (!areImageDataEqual(
            baseline.material.imageData,
            material.imageData,
          ) ||
            baseline.skinIsSlim !== skinIsSlim)
        ) {
          set(() => ({
            undoStack: [...state.undoStack, snapshot],
            redoStack: [],
            batchInProgress: false,
            batchBaseline: null,
          }));
        } else {
          set({
            batchInProgress: false,
            batchBaseline: null,
          });
        }
      },

      undo: () => {
        const state = get();
        if (state.undoStack.length > 1) {
          const current = state.undoStack[state.undoStack.length - 1];
          const newUndoStack = state.undoStack.slice(0, -1);
          const prev = newUndoStack[newUndoStack.length - 1];

          set({
            undoStack: newUndoStack,
            redoStack: [...state.redoStack, current],
            skinIsSlim: prev.skinIsSlim,
          });

          return prev;
        }
        return null;
      },

      redo: () => {
        const state = get();
        if (state.redoStack.length > 0) {
          const next = state.redoStack[state.redoStack.length - 1];
          const newRedoStack = state.redoStack.slice(0, -1);

          set({
            undoStack: [...state.undoStack, next],
            redoStack: newRedoStack,
            skinIsSlim: next.skinIsSlim,
          });

          return next;
        }
        return null;
      },

      pushToUndoStack: (snapshot) => {
        set((state) => ({
          undoStack: [...state.undoStack, snapshot],
          redoStack: [],
        }));
      },

      clearHistory: () => {
        set({
          undoStack: [],
          redoStack: [],
          batchInProgress: false,
          batchBaseline: null,
        });
      },

      // Persistence: explicit save() is synchronous so callers that need the
      // write on disk right now (tests, beforeunload) get it; setValue keeps
      // its throttled auto-save.
      save: () => {
        persistNow();
      },

      load: () => {
        if (!definedWindow) return;

        // Try to migrate from old localStorage key
        const oldConfigString = localStorage.getItem(OLD_LOCALSTORAGE_KEY);
        const configString = localStorage.getItem(CURRENT_LOCALSTORAGE_KEY);

        if (oldConfigString && !configString) {
          const oldConfig = parseStringState(oldConfigString);
          set({ ...defaultFormValues, ...migrateConfig(oldConfig) });
          throttledSave();
          return;
        }

        if (configString) {
          const config = parseStringState(configString);
          set({ ...defaultFormValues, ...migrateConfig(config) });
        }
      },

      reset: () => {
        set({ ...defaultFormValues, errors: {} });
        throttledSave();
      },

      // Touch drawing
      setTouchDrawActive: (active) => {
        set({ touchDrawActive: active });
      },
    };
  });

// In dev, pin the store on globalThis so HMR re-evaluation of this module
// doesn't replace it with a fresh instance and wipe all runtime state.
// Trade-off: edits to store action logic need a manual refresh to apply.
const globalStores = globalThis as unknown as {
  __loomsRendererStore?: ReturnType<typeof createRendererStore>;
};

export const rendererStore = import.meta.env.DEV
  ? (globalStores.__loomsRendererStore ??= createRendererStore())
  : createRendererStore();

// Export getState and subscribe for non-React usage
export const getRendererState = rendererStore.getState;
export const subscribeToRenderer = rendererStore.subscribe;

/**
 * React hook for accessing the renderer store with selectors.
 */
export function useRendererStore<T>(selector: (state: RendererStore) => T): T {
  return useStore(rendererStore, selector);
}

// Computed selectors for common use cases

/**
 * Get undo count (number of undo steps available)
 */
export const selectUndoCount = (state: RendererStore): number =>
  Math.max(0, state.undoStack.length - 1);

/**
 * Get redo count (number of redo steps available)
 */
export const selectRedoCount = (state: RendererStore): number =>
  state.redoStack.length;

/**
 * Check if any overlay part is visible (for paint overlay logic)
 */
export const selectPaintOverlay = (state: RendererStore): boolean =>
  getPaintOverlay(state);

/**
 * Get visibility for a specific part
 */
export const selectPartVisibility =
  (layer: Layers, part: Parts) =>
  (state: RendererStore): boolean => {
    const key = `${layer}${part}Visible` as keyof FormValues;
    return state[key] as boolean;
  };

/**
 * Initializes the renderer state from localStorage.
 * Call this once at app startup in a layout component.
 */
export function useInitRendererState() {
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    getRendererState().load();
  }, []);
}

const initRef = { current: false };

export type {
  FieldErrors,
  FormValues,
  HistorySnapshot,
  Layers,
  Parts,
  PersistableState,
  RendererStore,
} from "./types";
export type {
  PaintMode,
  EditorMode,
  EnvironmentPreset,
} from "./types";
export {
  FLOOR_COLOR_LIGHT,
  FLOOR_COLOR_DARK,
  getVisibilityKey,
  getPaintOverlay,
} from "./types";
