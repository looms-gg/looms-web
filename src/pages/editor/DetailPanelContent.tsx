// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: daisyUI collapse accordions instead of radix
// accordion, phosphor icons instead of the mineskin icon set, English copy
// instead of the i18n dictionary.
import { useMemo } from "react";
import { useRendererStore } from "../../editor/store";
import Slider from "./controls/Slider";
import ToggleSwitch from "./controls/ToggleSwitch";
import { bodies } from "../../data/bodies";
import { cn } from "../../editor/core/utils";

export interface DetailPanelContentProps {
  className?: string;
  hideHeader?: boolean;
  exitButton?: React.ReactNode;
  handleSlimSwitch?: (checked: boolean) => void;
}

const FORMATS = {
  percent: (v: number) => `${Math.round(v * 100)}%`,
  radians: (v: number) => `${((v * 180) / Math.PI).toFixed(0)}°`,
  units: (v: number) => v.toFixed(1),
};

function Section({ label, children, open = false }: { label: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="collapse collapse-arrow rounded-[10px] bg-base-content/5 my-2" open={open}>
      <summary className="collapse-title min-h-0 cursor-pointer py-2.5 text-sm font-extrabold text-base-content/85">
        {label}
      </summary>
      <div className="collapse-content px-2">{children}</div>
    </details>
  );
}

const Divider = () => <hr className="my-3 h-px w-full border-none bg-base-content/10" />;

export default function DetailPanelContent({
  className,
  handleSlimSwitch,
}: DetailPanelContentProps) {
  const state = useRendererStore((s) => s);
  const setValue = state.setValue;

  const sliderSetters = useMemo(() => {
    const numericKeys = [
      "variationIntensity",
      "cameraFieldOfView",
      "directionalLightIntensity",
      "ambientLight",
    ] as const;
    const out = {} as Record<(typeof numericKeys)[number], (v: number) => void>;
    for (const key of numericKeys) {
      out[key] = (v: number) => setValue(key, v);
    }
    return out;
  }, [setValue]);

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      <Section label="Model" open>
        <ToggleSwitch
          label="Slim arms"
          id="slim-arms"
          checked={state.skinIsSlim}
          onCheckedChange={(checked) => handleSlimSwitch?.(checked)}
        />
        <p className="mt-1 text-xs text-base-content/55">
          Classic has 4-pixel-wide arms, slim has 3.
        </p>

        <Divider />

        <ToggleSwitch
          label="Show body guide"
          id="guide-body-visible"
          checked={state.guideBodyVisible}
          onCheckedChange={(checked) => setValue("guideBodyVisible", checked)}
        />
        <div className="mt-2">
          <label
            htmlFor="guide-body-id"
            className="mb-1 block text-xs font-bold text-base-content/70"
          >
            Skin tone
          </label>
          <select
            id="guide-body-id"
            className="select select-bordered select-sm w-full rounded-[10px] bg-base-100 text-sm capitalize"
            value={state.guideBodyId}
            onChange={(e) => setValue("guideBodyId", e.target.value)}
          >
            {bodies.map((body) => (
              <option key={body.id} value={body.id}>
                {body.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-base-content/55">
          The guide body is a reference only. It is never part of the texture
          you save or upload.
        </p>
      </Section>

      <Section label="Paint">
        <Slider
          label="Shade brush intensity"
          value={state.variationIntensity}
          onChange={sliderSetters.variationIntensity}
          max={6}
          min={1}
          step={1}
          formatValue={(v) => `${Math.round(v)}`}
          editKey="variationIntensity"
        />
      </Section>

      <Section label="Camera & light">
        <Slider
          label="Field of view"
          value={state.cameraFieldOfView}
          onChange={sliderSetters.cameraFieldOfView}
          max={Math.PI - 0.1}
          min={0.4}
          step={0.001}
          formatValue={FORMATS.radians}
          editKey="cameraFieldOfView"
        />
        <Slider
          label="Main light"
          value={state.directionalLightIntensity}
          onChange={sliderSetters.directionalLightIntensity}
          max={1}
          min={0}
          step={0.01}
          formatValue={FORMATS.percent}
          editKey="directionalLightIntensity"
        />
        <Slider
          label="Overall brightness"
          value={state.ambientLight}
          onChange={sliderSetters.ambientLight}
          max={1}
          min={0}
          step={0.01}
          formatValue={FORMATS.percent}
          editKey="ambientLight"
        />
      </Section>
    </div>
  );
}