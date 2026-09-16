// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: daisyUI collapse accordions instead of radix
// accordion, phosphor icons instead of the mineskin icon set, English copy
// instead of the i18n dictionary.
import { useMemo } from "react";
import { useRendererStore } from "../../editor/store";
import {
  isEnvironmentTransformLocked,
} from "../../editor/core/environment";
import Slider from "./controls/Slider";
import ToggleSwitch from "./controls/ToggleSwitch";
import { bodies } from "../../data/bodies";
import { cn } from "../../editor/core/utils";

export interface DetailPanelContentProps {
  className?: string;
  hideHeader?: boolean;
  exitButton?: React.ReactNode;
  handleSlimSwitch?: (checked: boolean) => void;
  handleFlipFrontToBack?: () => void;
  onResetModelTransform?: () => void;
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
  handleFlipFrontToBack,
  onResetModelTransform,
}: DetailPanelContentProps) {
  const state = useRendererStore((s) => s);
  const setValue = state.setValue;
  const envLocked = isEnvironmentTransformLocked(state.environmentPreset);

  const sliderSetters = useMemo(() => {
    const numericKeys = [
      "variationIntensity",
      "diffuseStrength",
      "specularStrength",
      "objectTranslationX",
      "objectTranslationY",
      "objectTranslationZ",
      "objectRotationX",
      "objectRotationY",
      "objectRotationZ",
      "cameraFieldOfView",
      "cameraSpeed",
      "cameraDampingFactor",
      "directionalLightIntensity",
      "diffuseLightPositionX",
      "diffuseLightPositionY",
      "diffuseLightPositionZ",
      "ambientLight",
    ] as const;
    const out = {} as Record<(typeof numericKeys)[number], (v: number) => void>;
    for (const key of numericKeys) {
      out[key] = (v: number) => setValue(key, v);
    }
    return out;
  }, [setValue]);

  const environmentOptions = [
    { value: "grid", label: "Grid" },
    { value: "empty", label: "Empty" },
    { value: "grassland", label: "Grassland" },
    { value: "scifi", label: "Sci-fi" },
  ] as const;

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

        {handleFlipFrontToBack ? (
          <button
            type="button"
            className="btn btn-outline btn-primary btn-sm mt-3 rounded-full font-bold"
            onClick={() => handleFlipFrontToBack()}
          >
            Flip front to back
          </button>
        ) : null}

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

      <Section label="Surface">
        <Slider
          label="Surface brightness"
          value={state.diffuseStrength}
          onChange={sliderSetters.diffuseStrength}
          max={1}
          min={0}
          step={0.01}
          formatValue={FORMATS.percent}
          editKey="diffuseStrength"
        />
        <Slider
          label="Shine glossiness"
          value={state.specularStrength}
          onChange={sliderSetters.specularStrength}
          max={1}
          min={0}
          step={0.01}
          formatValue={FORMATS.percent}
          editKey="specularStrength"
        />

        <Divider />

        <Slider
          label="Move left / right"
          value={envLocked ? 0 : state.objectTranslationX}
          onChange={sliderSetters.objectTranslationX}
          max={100}
          min={-100}
          step={0.1}
          formatValue={FORMATS.units}
          editKey="objectTranslationX"
          disabled={envLocked}
          disabledTooltip="Locked by the current environment"
        />
        <Slider
          label="Move forward / back"
          value={envLocked ? 0 : state.objectTranslationZ}
          onChange={sliderSetters.objectTranslationZ}
          max={100}
          min={-100}
          step={0.1}
          formatValue={FORMATS.units}
          editKey="objectTranslationZ"
          disabled={envLocked}
          disabledTooltip="Locked by the current environment"
        />
        <Slider
          label="Move up / down"
          value={envLocked ? 0 : state.objectTranslationY}
          onChange={sliderSetters.objectTranslationY}
          max={100}
          min={-100}
          step={0.1}
          formatValue={FORMATS.units}
          editKey="objectTranslationY"
          disabled={envLocked}
          disabledTooltip="Locked by the current environment"
        />

        <Divider />

        <Slider
          label="Tilt up / down"
          value={state.objectRotationX}
          onChange={sliderSetters.objectRotationX}
          max={Math.PI}
          min={-Math.PI}
          step={0.001}
          formatValue={FORMATS.radians}
          editKey="objectRotationX"
        />
        <Slider
          label="Turn left / right"
          value={state.objectRotationY}
          onChange={sliderSetters.objectRotationY}
          max={Math.PI}
          min={-Math.PI}
          step={0.001}
          formatValue={FORMATS.radians}
          editKey="objectRotationY"
        />
        <Slider
          label="Roll"
          value={state.objectRotationZ}
          onChange={sliderSetters.objectRotationZ}
          max={Math.PI}
          min={-Math.PI}
          step={0.001}
          formatValue={FORMATS.radians}
          editKey="objectRotationZ"
        />

        {onResetModelTransform ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs mt-1 w-full rounded-full font-bold"
            onClick={onResetModelTransform}
          >
            Reset position and rotation
          </button>
        ) : null}
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
          label="Movement speed"
          value={state.cameraSpeed}
          onChange={sliderSetters.cameraSpeed}
          max={0.5}
          min={0}
          step={0.001}
          editKey="cameraSpeed"
        />
        <Slider
          label="Damping"
          value={state.cameraDampingFactor}
          onChange={sliderSetters.cameraDampingFactor}
          max={1}
          min={0}
          step={0.001}
          editKey="cameraDampingFactor"
        />
      </Section>

      <Section label="Light">
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
          label="Light left / right"
          value={state.diffuseLightPositionX}
          onChange={sliderSetters.diffuseLightPositionX}
          max={10}
          min={-10}
          step={0.1}
          formatValue={FORMATS.units}
          editKey="diffuseLightPositionX"
        />
        <Slider
          label="Light up / down"
          value={state.diffuseLightPositionY}
          onChange={sliderSetters.diffuseLightPositionY}
          max={10}
          min={-10}
          step={0.1}
          formatValue={FORMATS.units}
          editKey="diffuseLightPositionY"
        />
        <Slider
          label="Light forward / back"
          value={state.diffuseLightPositionZ}
          onChange={sliderSetters.diffuseLightPositionZ}
          max={10}
          min={-10}
          step={0.1}
          formatValue={FORMATS.units}
          editKey="diffuseLightPositionZ"
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

      <Section label="Scene">
        <p className="-mt-1 mb-3 text-xs text-base-content/55">
          Sets the backdrop around the model.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {environmentOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue("environmentPreset", option.value)}
              className={cn(
                "cursor-pointer rounded-xl border py-2 text-xs font-bold transition-colors",
                state.environmentPreset === option.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-base-content/10 bg-base-100 text-base-content/70 hover:bg-base-content/10",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <ToggleSwitch
            label="Show grid"
            id="grid-visible"
            checked={state.gridVisible}
            onCheckedChange={(checked) => setValue("gridVisible", checked)}
          />
        </div>
        <div className="mt-2">
          <label
            htmlFor="floor-color"
            className="mb-1 block text-xs font-bold text-base-content/70"
          >
            Floor color
          </label>
          <input
            id="floor-color"
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(state.floorColor) ? state.floorColor : "#000000"}
            onChange={(e) => setValue("floorColor", e.target.value)}
            className="size-9 cursor-pointer rounded-lg bg-transparent"
          />
        </div>
      </Section>
    </div>
  );
}
