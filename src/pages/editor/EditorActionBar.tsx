import { memo } from "react"
import { FloppyDisk } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"

export interface EditorActionBarProps {
  onOpenSave?: () => void
  className?: string
}

// Gestures the stage answers to. Kept as data so the bar stays a layout shell
// and the tips can be tested without scraping markup.
export const EDITOR_KEYBIND_TIPS: { keys: string[]; text: string }[] = [
  { keys: ["Drag"], text: "paint / rotate around the model" },
  { keys: ["Right click"], text: "paint with secondary color" },
  { keys: ["Shift"], text: "pan the camera" },
  { keys: ["Shift", "Double click"], text: "focus a body part" },
]

function KeybindTip({ keys, text }: { keys: string[]; text: string }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      {keys.map((key, index) => (
        <span key={key} className="flex items-center gap-1">
          {index > 0 ? <span className="text-[11px] font-bold text-base-content/40">+</span> : null}
          <kbd className="rounded-md border border-base-content/20 bg-base-100 px-1 py-px font-mono text-[10px] font-bold text-base-content/80">
            {key}
          </kbd>
        </span>
      ))}
      <span className="text-[11px] font-semibold text-base-content/55">{text}</span>
    </span>
  )
}

export const EditorActionBar = memo(function EditorActionBar({
  onOpenSave,
  className = "",
}: EditorActionBarProps) {
  return (
    <div
      className={`relative z-40 hidden shrink-0 items-center justify-between gap-4 border-t border-base-content/10 bg-base-200/95 px-3 py-1.5 select-none md:flex ${className}`}
    >
      {/* Keybind tips */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        {EDITOR_KEYBIND_TIPS.map((tip) => (
          <KeybindTip key={tip.text} keys={tip.keys} text={tip.text} />
        ))}
      </div>

      {/* Same proportions as the Studio save form: neutral container, one pink CTA */}
      <div className="flex shrink-0 items-center rounded-xl bg-base-300/90 p-1 border border-base-content/12 shadow-sm">
        <button
          type="button"
          onClick={onOpenSave}
          aria-label="Save & Export"
          className="btn btn-primary btn-sm h-7 min-h-7 rounded-lg px-3 font-black text-[11px] gap-1.5 shadow-xs"
        >
          <Icon icon={FloppyDisk} size="xs" />
          <span>Save &amp; Export</span>
        </button>
      </div>
    </div>
  )
})
