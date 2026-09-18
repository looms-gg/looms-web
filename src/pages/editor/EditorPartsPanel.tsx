import { memo } from "react"
import { ArrowsCounterClockwise, Eye, EyeSlash, Sparkle } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import type { SkinEditorState } from "./useSkinEditor"

export const EditorPartsPanel = memo(function EditorPartsPanel({ editor }: { editor: SkinEditorState }) {
  const {
    layers,
    toggleLayer,
    limbs,
    toggleLimb,
    isolateLimb,
    showAllLimbs,
  } = editor.visibility

  const hasHiddenLimbs = Object.values(limbs).some((v) => !v)

  return (
    <aside className="editor-parts studio-layers flex flex-col gap-4 overflow-y-auto rounded-[18px] bg-base-200 p-4 shrink-0 min-h-0 border border-base-content/10">
      {/* Panel Header */}
      <div className="studio-layers-head">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight">Layers & Limbs</h2>
          <span className="text-[11px] font-bold text-base-content/50">Visibility</span>
        </div>
        <p className="mt-0.5 text-xs text-base-content/65">
          Toggle 3D layers or click limbs to isolate specific parts.
        </p>

        {/* Inner vs Outer Layer segmented control */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-base-content/10 pt-3">
          <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/60">
            Layers
          </span>
          <div
            className="flex items-center gap-1 rounded-full bg-base-300 p-0.5"
            role="group"
            aria-label="Layer visibility"
          >
            <button
              type="button"
              onClick={() => toggleLayer("inner")}
              className={`btn btn-xs h-7 min-h-0 rounded-full border-0 font-extrabold px-2.5 gap-1 transition-all cursor-pointer ${
                layers.inner
                  ? "btn-primary shadow-xs"
                  : "btn-ghost text-base-content/50 hover:text-base-content"
              }`}
              title="Toggle Inner Body Layer"
            >
              <Icon icon={layers.inner ? Eye : EyeSlash} size="xs" />
              <span>Inner</span>
            </button>
            <button
              type="button"
              onClick={() => toggleLayer("outer")}
              className={`btn btn-xs h-7 min-h-0 rounded-full border-0 font-extrabold px-2.5 gap-1 transition-all cursor-pointer ${
                layers.outer
                  ? "btn-primary shadow-xs"
                  : "btn-ghost text-base-content/50 hover:text-base-content"
              }`}
              title="Toggle Outer Overlay / Hat Layer"
            >
              <Icon icon={layers.outer ? Eye : EyeSlash} size="xs" />
              <span>Outer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spatial Mannequin Limb Filter */}
      <div className="flex flex-col gap-2 min-h-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/60">
            Limbs
          </span>
          {hasHiddenLimbs && (
            <button
              type="button"
              onClick={showAllLimbs}
              className="btn btn-ghost btn-xs h-6 min-h-0 rounded-full px-2.5 text-[11px] font-extrabold text-primary hover:bg-base-300 cursor-pointer gap-1"
              title="Show all hidden limbs"
            >
              <Icon icon={ArrowsCounterClockwise} size="xs" />
              <span>Show all</span>
            </button>
          )}
        </div>

        {/* Tactile Spatial Mannequin Card */}
        <div className="rounded-[16px] bg-base-300/50 p-4 flex flex-col items-center gap-2 border border-base-content/5 shadow-inner">
          {/* Head */}
          <button
            type="button"
            onClick={() => toggleLimb("head")}
            onDoubleClick={() => isolateLimb("head")}
            aria-label="Toggle head"
            title="Head · Click: toggle, Double-click: isolate"
            className={`size-14 rounded-xl border flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
              limbs.head
                ? "border-primary bg-primary text-primary-content shadow-sm hover:brightness-105"
                : "border-base-content/20 bg-base-100/60 text-base-content/40 hover:border-base-content/40"
            }`}
          >
            {limbs.head ? (
              <span>Head</span>
            ) : (
              <Icon icon={EyeSlash} size="sm" className="opacity-60" />
            )}
          </button>

          {/* Torso & Arms */}
          <div className="flex items-center gap-2">
            {/* Right Arm */}
            <button
              type="button"
              onClick={() => toggleLimb("rightArm")}
              onDoubleClick={() => isolateLimb("rightArm")}
              aria-label="Toggle right arm"
              title="Right Arm · Click: toggle, Double-click: isolate"
              className={`h-20 w-9 rounded-xl border flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                limbs.rightArm
                  ? "border-primary bg-primary text-primary-content shadow-sm hover:brightness-105"
                  : "border-base-content/20 bg-base-100/60 text-base-content/40 hover:border-base-content/40"
              }`}
            >
              {limbs.rightArm ? (
                <span>R</span>
              ) : (
                <Icon icon={EyeSlash} size="xs" className="opacity-60" />
              )}
            </button>

            {/* Torso */}
            <button
              type="button"
              onClick={() => toggleLimb("body")}
              onDoubleClick={() => isolateLimb("body")}
              aria-label="Toggle body"
              title="Torso / Chest · Click: toggle, Double-click: isolate"
              className={`h-20 w-16 rounded-xl border flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                limbs.body
                  ? "border-primary bg-primary text-primary-content shadow-sm hover:brightness-105"
                  : "border-base-content/20 bg-base-100/60 text-base-content/40 hover:border-base-content/40"
              }`}
            >
              {limbs.body ? (
                <span>Torso</span>
              ) : (
                <Icon icon={EyeSlash} size="sm" className="opacity-60" />
              )}
            </button>

            {/* Left Arm */}
            <button
              type="button"
              onClick={() => toggleLimb("leftArm")}
              onDoubleClick={() => isolateLimb("leftArm")}
              aria-label="Toggle left arm"
              title="Left Arm · Click: toggle, Double-click: isolate"
              className={`h-20 w-9 rounded-xl border flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                limbs.leftArm
                  ? "border-primary bg-primary text-primary-content shadow-sm hover:brightness-105"
                  : "border-base-content/20 bg-base-100/60 text-base-content/40 hover:border-base-content/40"
              }`}
            >
              {limbs.leftArm ? (
                <span>L</span>
              ) : (
                <Icon icon={EyeSlash} size="xs" className="opacity-60" />
              )}
            </button>
          </div>

          {/* Legs */}
          <div className="flex items-center gap-2">
            {/* Right Leg */}
            <button
              type="button"
              onClick={() => toggleLimb("rightLeg")}
              onDoubleClick={() => isolateLimb("rightLeg")}
              aria-label="Toggle right leg"
              title="Right Leg · Click: toggle, Double-click: isolate"
              className={`h-20 w-9 rounded-xl border flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                limbs.rightLeg
                  ? "border-primary bg-primary text-primary-content shadow-sm hover:brightness-105"
                  : "border-base-content/20 bg-base-100/60 text-base-content/40 hover:border-base-content/40"
              }`}
            >
              {limbs.rightLeg ? (
                <span>R</span>
              ) : (
                <Icon icon={EyeSlash} size="xs" className="opacity-60" />
              )}
            </button>

            {/* Left Leg */}
            <button
              type="button"
              onClick={() => toggleLimb("leftLeg")}
              onDoubleClick={() => isolateLimb("leftLeg")}
              aria-label="Toggle left leg"
              title="Left Leg · Click: toggle, Double-click: isolate"
              className={`h-20 w-9 rounded-xl border flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer select-none active:scale-95 ${
                limbs.leftLeg
                  ? "border-primary bg-primary text-primary-content shadow-sm hover:brightness-105"
                  : "border-base-content/20 bg-base-100/60 text-base-content/40 hover:border-base-content/40"
              }`}
            >
              {limbs.leftLeg ? (
                <span>L</span>
              ) : (
                <Icon icon={EyeSlash} size="xs" className="opacity-60" />
              )}
            </button>
          </div>

          <p className="mt-1 text-center text-[10px] font-semibold text-base-content/50">
            Click to toggle · Double-click to isolate
          </p>
        </div>
      </div>

      {/* Shortcuts Callout */}
      <div className="mt-auto border-t border-base-content/10 pt-3">
        <div className="rounded-[14px] bg-base-300/65 p-3 text-[11px] text-base-content/70 space-y-1.5 border border-base-content/5">
          <div className="flex items-center gap-1 font-extrabold text-base-content">
            <Icon icon={Sparkle} size="xs" className="text-primary" />
            <span>Hotkeys</span>
          </div>
          <div className="grid grid-cols-2 gap-1 pt-0.5 text-[10px]">
            <span><kbd className="kbd kbd-xs">P</kbd> Pen</span>
            <span><kbd className="kbd kbd-xs">E</kbd> Eraser</span>
            <span><kbd className="kbd kbd-xs">B</kbd> Bucket</span>
            <span><kbd className="kbd kbd-xs">S</kbd> Shading</span>
            <span><kbd className="kbd kbd-xs">X</kbd> Swap</span>
            <span><kbd className="kbd kbd-xs">⌘Z</kbd> Undo</span>
          </div>
        </div>
      </div>
    </aside>
  )
})
