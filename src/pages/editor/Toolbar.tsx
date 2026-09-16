// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: the animation, pose, reference-image,
// screenshot, and record tools are out of scope for this port. Tooltips are
// daisyUI tooltips; icons are phosphor via the Icon wrapper.
import { useCallback } from "react";
import { useRendererStore } from "../../editor/store";
import ToolButton from "./ToolButton";
import BrushFlyout from "./BrushFlyout";
import ColorPicker from "./ColorPicker";
import { Icon } from "../../components/ui/Icon";
import {
  ArrowsCounterClockwise,
  ArrowsClockwise,
  ArrowsLeftRight,
  Eyedropper,
  Gear,
  Hand,
  HandGrabbing,
} from "@phosphor-icons/react";

const isMac =
  typeof window !== "undefined" &&
  window.navigator.userAgent.includes("Macintosh");
const cmdKey = isMac ? "Cmd" : "Ctrl";

const RailDivider = () => (
  <div className="mx-auto my-1.5 h-px w-7 rounded-full bg-base-content/15" />
);

export interface ToolbarProps {
  redo: (() => void) | undefined;
  undo: (() => void) | undefined;
  redoCount: number;
  undoCount: number;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  getUniqueColors: () => string[];
}

const Toolbar: React.FC<ToolbarProps> = ({
  redo,
  undo,
  redoCount,
  undoCount,
  settingsOpen,
  setSettingsOpen,
  getUniqueColors,
}) => {
  const colorPickerActive = useRendererStore((state) => state.colorPickerActive);
  const gridVisible = useRendererStore((state) => state.gridVisible);
  const mirrorPaint = useRendererStore((state) => state.mirrorPaint);
  const touchDrawMode = useRendererStore((state) => state.touchDrawMode);
  const setValue = useRendererStore((state) => state.setValue);

  const setColorPickerActive = useCallback(
    (active: boolean) => {
      setValue("colorPickerActive", active);
    },
    [setValue],
  );

  const toggleGrid = useCallback(() => {
    setValue("gridVisible", !gridVisible);
  }, [setValue, gridVisible]);

  const toggleTouchDrawMode = useCallback(() => {
    setValue("touchDrawMode", !touchDrawMode);
  }, [setValue, touchDrawMode]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="pointer-events-auto absolute left-0 top-0 ml-1.5 mt-1.5 select-none rounded-2xl border border-base-content/10 bg-base-200/90 shadow-lg backdrop-blur"
    >
      <div className="max-h-[calc(100dvh-120px)] w-full overflow-y-auto">
        <div className="flex flex-col items-center gap-1 p-2">
          <div className="flex flex-col items-center gap-1.5">
            <ColorPicker
              label="Color"
              id="color-picker"
              getUniqueColors={getUniqueColors}
            />
            <ToolButton
              label="Pick color"
              onClick={() => setColorPickerActive(!colorPickerActive)}
              active={colorPickerActive}
            >
              <Icon icon={Eyedropper} size="md" />
            </ToolButton>
          </div>

          <RailDivider />

          <BrushFlyout />

          {mirrorPaint ? (
            <ToolButton
              label="Turn symmetry off"
              onClick={() => setValue("mirrorPaint", false)}
              active
            >
              <Icon icon={ArrowsLeftRight} size="md" />
            </ToolButton>
          ) : null}

          <RailDivider />

          <div className="flex flex-col items-center gap-1">
            <ToolButton
              label={`Undo (${cmdKey}+Z)`}
              onClick={undo || (() => {})}
              disabled={undoCount === 0 && !!undo}
            >
              <Icon icon={ArrowsCounterClockwise} size="md" />
            </ToolButton>
            <ToolButton
              label={`Redo (${cmdKey}+Shift+Z)`}
              onClick={redo || (() => {})}
              disabled={redoCount === 0 && !!redo}
            >
              <Icon icon={ArrowsClockwise} size="md" />
            </ToolButton>
          </div>

          <RailDivider />

          <div className="flex flex-col items-center gap-1">
            <ToolButton label="Toggle grid" onClick={toggleGrid} active={gridVisible}>
              <span className="text-xs font-extrabold">#</span>
            </ToolButton>

            <ToolButton
              label="Toggle touch drawing"
              onClick={toggleTouchDrawMode}
              active={touchDrawMode}
            >
              <Icon icon={touchDrawMode ? Hand : HandGrabbing} size="md" />
            </ToolButton>
          </div>

          <RailDivider />

          <ToolButton
            label="Settings"
            onClick={() => setSettingsOpen(!settingsOpen)}
            active={settingsOpen}
          >
            <Icon icon={Gear} size="md" />
          </ToolButton>
        </div>
      </div>

    </div>
  );
};

export default Toolbar;
