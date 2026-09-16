// The editor workspace: full-bleed skinview3d canvas, floating tool rail,
// detail panel, top-right HUD, and save actions. The ported MineSkin renderer
// was retired in favor of the same skinview3d stage the Studio page uses.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { SkinEditorStage } from "../../editor/stage/SkinEditorStage";
import { selectRedoCount, selectUndoCount, useInitRendererState, useRendererStore } from "../../editor/store";
import type { Parts } from "../../editor/types";
import Toolbar from "./Toolbar";
import RotationGizmo from "./RotationGizmo";
import DesktopPartFilter from "./DesktopPartFilter";
import SaveModal from "./SaveModal";
import { Icon } from "../../components/ui/Icon";
import { PersonSimple, PersonSimpleThrow } from "@phosphor-icons/react";
import DetailPanel from "./DetailPanel";
import DetailPanelContent from "./DetailPanelContent";
import { rgbToHex } from "../../editor/color/colorUtils";

function uniqueColorsFrom(canvas: HTMLCanvasElement): string[] {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Count usage per exact color so near-duplicate merging keeps each
  // cluster's dominant shade (same behavior as the previous engine).
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key =
      data[i] * 0x1000000 + data[i + 1] * 0x10000 + data[i + 2] * 0x100 + data[i + 3];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const MERGE_DISTANCE_SQ = 8 * 8;
  const byUsage = Array.from(counts.keys()).sort(
    (a, b) => counts.get(b)! - counts.get(a)!,
  );
  const kept: [number, number, number, number][] = [];
  for (const key of byUsage) {
    const r = key >>> 24;
    const g = (key >>> 16) & 0xff;
    const b = (key >>> 8) & 0xff;
    const a = key & 0xff;
    const absorbed = kept.some(([kr, kg, kb, ka]) => {
      const dr = kr - r;
      const dg = kg - g;
      const db = kb - b;
      const da = ka - a;
      return dr * dr + dg * dg + db * db + da * da <= MERGE_DISTANCE_SQ;
    });
    if (!absorbed) kept.push([r, g, b, a]);
  }
  return kept.map(([r, g, b, a]) => rgbToHex(r, g, b, a));
}

export default function EditorLayout() {
  // Restore persisted editor settings (camera, lights, brush, guide body)
  // before the stage reads them during setup.
  useInitRendererState();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<SkinEditorStage | null>(null);
  const [backendNotSupported, setBackendNotSupported] = useState(false);
  const undoCount = useRendererStore(selectUndoCount);
  const redoCount = useRendererStore(selectRedoCount);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // The layer starts blank; any undo stack entry means real strokes.
  // Drives the Save gate, the unsaved dot, and the leave guard.
  const hasWork = undoCount > 0;

  useEffect(() => {
    if (!hasWork) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasWork]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSaveOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    let stageInstance: SkinEditorStage | null = null;
    try {
      stageInstance = new SkinEditorStage(canvas, wrapper);
      setStage(stageInstance);
    } catch (error) {
      console.error("Editor stage failed to start", error);
      setBackendNotSupported(true);
    }
    return () => {
      stageInstance?.dispose();
      setStage(null);
    };
  }, []);

  // The 3D canvas is a fixed layer painted behind the workspace chrome; tell
  // the stage nothing here — skinview3d owns its own canvas sizing.
  const undo = useCallback(() => {
    stage?.undo();
  }, [stage]);

  const redo = useCallback(() => {
    stage?.redo();
  }, [stage]);

  const getTextureCanvas = useCallback((): HTMLCanvasElement | null => {
    return stage?.getTextureCanvas() ?? null;
  }, [stage]);

  const getUniqueColors = useCallback((): string[] => {
    const canvas = stage?.getTextureCanvas();
    return canvas ? uniqueColorsFrom(canvas) : [];
  }, [stage]);

  const [guideParts, setGuideParts] = useState<Record<Parts, boolean>>({
    head: true,
    body: true,
    leftArm: true,
    rightArm: true,
    leftLeg: true,
    rightLeg: true,
  });
  const toggleGuidePart = useCallback(
    (part: Parts) => {
      setGuideParts((prev) => {
        const next = { ...prev, [part]: !prev[part] };
        stage?.setGuidePartVisible(part, next[part]);
        return next;
      });
    },
    [stage],
  );

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <div ref={wrapperRef} className="absolute inset-0">
        <canvas
          ref={canvasRef as RefObject<HTMLCanvasElement>}
          className="absolute inset-0 size-full touch-none"
        />
      </div>

      {backendNotSupported ? (
        <div className="pointer-events-auto absolute inset-0 grid place-items-center p-6">
          <div className="max-w-sm rounded-2xl border border-base-content/10 bg-base-200 p-6 text-center shadow-xl">
            <h2 className="text-lg font-extrabold text-base-content">
              This browser can't run the editor
            </h2>
            <p className="mt-2 text-sm text-base-content/65">
              The editor needs WebGL to draw the 3D model. Try a current
              version of Chrome, Firefox, Edge, or Safari.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Toolbar
            redo={redo}
            undo={undo}
            redoCount={redoCount}
            undoCount={undoCount}
            settingsOpen={controlPanelOpen}
            setSettingsOpen={setControlPanelOpen}
            getUniqueColors={getUniqueColors}
          />

          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              disabled={!hasWork}
              title={hasWork ? "Save (Cmd+S)" : "Paint something first"}
              className="btn btn-primary btn-sm rounded-full font-extrabold shadow-sm disabled:border-transparent disabled:bg-base-200 disabled:text-base-content/40 disabled:shadow-none"
            >
              {hasWork ? (
                <span className="relative inline-flex items-center gap-1.5">
                  Save
                  <span
                    aria-hidden
                    className="absolute -right-2.5 -top-2 size-2 rounded-full bg-primary ring-2 ring-base-100"
                  />
                </span>
              ) : (
                "Save"
              )}
            </button>
          </div>

          {/* Camera framing presets: the Studio's pill row, pointed at the
              part being painted. */}
          <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-base-content/10 bg-base-200 p-1 shadow-sm">
            {(
              [
                ["Head", "head", PersonSimple],
                ["Body", "body", PersonSimpleThrow],
                ["Legs", "legs", PersonSimple],
              ] as const
            ).map(([label, preset, icon]) => (
              <button
                key={label}
                type="button"
                title={`Frame the ${label.toLowerCase()}`}
                onClick={() => stage?.framePreset(preset)}
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold text-base-content/70 transition-colors hover:bg-base-content/10 hover:text-base-content"
              >
                <Icon icon={icon} size="xs" />
                {label}
              </button>
            ))}
          </div>

          {/* Top-right HUD: rotation gizmo above the part silhouettes,
              matching the MineSkin dashboard layout. */}
          <div className="pointer-events-none absolute right-3 top-14 flex flex-col items-center gap-2.5">
            <RotationGizmo />
            <div className="pointer-events-auto rounded-[18px] border border-base-content/10 bg-base-200 p-3 shadow-sm">
              <DesktopPartFilter
                guideVisibility={guideParts}
                onToggleGuidePart={toggleGuidePart}
              />
            </div>
          </div>

          <DetailPanel
            open={controlPanelOpen}
            setOpen={setControlPanelOpen}
            className="pointer-events-auto"
          >
            <DetailPanelContent />
          </DetailPanel>

          <SaveModal
            open={saveOpen}
            onClose={() => setSaveOpen(false)}
            getTextureCanvas={getTextureCanvas}
          />
        </>
      )}
    </div>
  );
}
