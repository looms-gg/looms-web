// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// The MineSkin dashboard trimmed to the looms editor: full-bleed canvas,
// floating toolbar, detail panel, and a save action. Animation, pose, recorder,
// screenshot, watermark, reference panel, and library are out of scope.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { MiSkiEditingRenderer } from "../../editor/core/MiSkiRenderer";
import { resetModelTranslation, resetModelRotation } from "../../editor/core/modelTransform";
import { selectRedoCount, selectUndoCount, useInitRendererState, useRendererStore } from "../../editor/store";
import useEditorRenderer from "./useEditorRenderer";
import Toolbar from "./Toolbar";
import RotationGizmo from "./RotationGizmo";
import DesktopPartFilter from "./DesktopPartFilter";
import DetailPanel from "./DetailPanel";
import DetailPanelContent from "./DetailPanelContent";
import SaveModal from "./SaveModal";

/** How far the visible canvas region's center sits from the window's, in px. */
const CANVAS_CENTER_VAR = "--canvas-center-offset";

export default function EditorLayout() {
  // Restore persisted editor settings (camera, lights, brush, guide body)
  // before the renderer reads them during setup.
  useInitRendererState();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { renderer, backendNotSupported } = useEditorRenderer(
    MiSkiEditingRenderer,
    canvasRef,
  );
  const undoCount = useRendererStore(selectUndoCount);
  const redoCount = useRendererStore(selectRedoCount);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  // The 3D canvas is a full-screen fixed layer painted behind the workspace
  // chrome. Rather than shrinking the canvas, we tell the renderer how far the
  // visible main region's center has drifted from the canvas center, and it
  // shifts the projection so the model recenters into the visible area.
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = mainRef.current;
    const canvas = canvasRef.current;
    const backend = renderer?.backend;
    if (!main || !canvas || !backend) return;
    const sync = () => {
      const mainRect = main.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const mainCenter = mainRect.left + mainRect.width / 2;
      const canvasCenter = canvasRect.left + canvasRect.width / 2;
      const offset = mainCenter - canvasCenter;
      backend.setViewportCenterOffset(offset);
      document.documentElement.style.setProperty(
        CANVAS_CENTER_VAR,
        `${Math.round(offset)}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(main);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      backend.setViewportCenterOffset(0);
      document.documentElement.style.removeProperty(CANVAS_CENTER_VAR);
    };
  }, [backendNotSupported, renderer]);

  const undo = useCallback(() => {
    renderer?.undo();
  }, [renderer]);

  const redo = useCallback(() => {
    renderer?.redo();
  }, [renderer]);

  const getTextureCanvas = useCallback((): HTMLCanvasElement | null => {
    const material = renderer?.getMainSkin()?.material;
    if (!material?.imageData) return null;
    const canvas = document.createElement("canvas");
    canvas.width = material.imageData.width;
    canvas.height = material.imageData.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.putImageData(material.imageData, 0, 0);
    return canvas;
  }, [renderer]);

  const getUniqueColors = useCallback((): string[] => {
    return renderer instanceof MiSkiEditingRenderer
      ? renderer.getUniqueColors()
      : [];
  }, [renderer]);

  const handleSlimSwitch = useCallback(
    (newIsSlim: boolean) => {
      renderer?.handleSlimSwitch(newIsSlim);
    },
    [renderer],
  );

  const handleFlipFrontToBack = useCallback(() => {
    renderer?.flipFrontToBack();
  }, [renderer]);

  const handleResetTransform = useCallback(() => {
    resetModelTranslation();
    resetModelRotation();
  }, []);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <canvas
        ref={canvasRef as RefObject<HTMLCanvasElement>}
        className="fixed inset-0 size-full touch-none"
      />

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

          <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              className="btn btn-primary btn-sm rounded-full font-extrabold shadow-lg"
            >
              Save
            </button>
          </div>

          {/* Top-right HUD: rotation gizmo above the part silhouettes,
              matching the MineSkin dashboard layout. */}
          <div className="pointer-events-none absolute right-1.5 top-14 flex flex-col items-center gap-2.5">
            <RotationGizmo />
            <div className="pointer-events-auto rounded-2xl border border-base-content/10 bg-base-200/90 p-3 shadow-lg backdrop-blur">
              <DesktopPartFilter />
            </div>
          </div>

          <DetailPanel
            open={controlPanelOpen}
            setOpen={setControlPanelOpen}
            className="pointer-events-auto"
          >
            <DetailPanelContent
              handleSlimSwitch={handleSlimSwitch}
              handleFlipFrontToBack={handleFlipFrontToBack}
              onResetModelTransform={handleResetTransform}
            />
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
