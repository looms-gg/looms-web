import { PICKER_PRESETS } from "./tools/colorModel"
import type { SkinEditorState } from "./useSkinEditor"

export function EditorQuickPalette({ editor }: { editor: SkinEditorState }) {
  const { setPrimaryColor } = editor.colors
  const { primaryColor = "" } = editor.colors.data
  const activeHex = primaryColor.toLowerCase()

  return (
    <div
      role="listbox"
      aria-label="Quick palette"
      className="editor-float pointer-events-auto absolute bottom-3 left-[84px] z-20 hidden grid-cols-6 gap-1.5 rounded-lg p-2 md:grid"
    >
      {PICKER_PRESETS.map((hex) => {
        const on = hex.toLowerCase() === activeHex
        return (
          <button
            key={hex}
            type="button"
            role="option"
            aria-selected={on}
            aria-label={`Use color ${hex}`}
            title={hex}
            onClick={() => setPrimaryColor(hex)}
            style={{ backgroundColor: hex }}
            className={`pointer-events-auto h-6 w-6 shrink-0 cursor-pointer rounded-md border transition-transform hover:scale-110 ${
              on
                ? "border-base-100 ring-2 ring-primary"
                : "border-base-content/25"
            }`}
          />
        )
      })}
    </div>
  )
}
