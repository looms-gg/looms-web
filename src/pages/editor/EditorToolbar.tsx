import { memo, useRef, useState } from "react"
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Gear,
  GridFour,
  SquaresFour,
  Swap,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { useDismissable } from "../../components/shell/useDismissable"
import type { EditorTool, SkinEditorState } from "./useSkinEditor"
import { EditorColorPicker } from "./EditorColorPicker"
import { EDITOR_TOOL_DEFS } from "./tools/editorToolDefs"

export interface EditorToolbarProps {
  editor: SkinEditorState
  onToggleUvDrawer?: () => void
  uvDrawerOpen?: boolean
  onResetCamera?: () => void
  className?: string
}

const RailDivider = () => (
  <div className="mx-auto my-1 h-px w-8 rounded-full bg-base-content/15" />
)

const TOOL_TILE =
  "flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-extrabold transition-colors"
const TOOL_TILE_OFF = `${TOOL_TILE} text-base-content/70 hover:bg-base-content/10 hover:text-base-content`
const TOOL_TILE_ON = `${TOOL_TILE} bg-primary/15 text-primary hover:bg-primary/20`

const ICON_BTN =
  "flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
const ICON_BTN_ON = "bg-primary/15 text-primary hover:bg-primary/20"

export const EditorToolbar = memo(function EditorToolbar({
  editor,
  onToggleUvDrawer,
  uvDrawerOpen = false,
  onResetCamera,
  className = "",
}: EditorToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const colorRef = useRef<HTMLDivElement | null>(null)
  const settingsRef = useRef<HTMLDivElement | null>(null)

  const {
    tool,
    shadingMode = "lighten",
    gridVisible,
  } = editor.brush.data
  const { patch } = editor.brush
  const {
    primaryColor,
    secondaryColor,
    recentColors,
  } = editor.colors.data
  const { setPrimaryColor, swapColors } = editor.colors
  const {
    undo,
    redo,
    canUndo,
    canRedo,
  } = editor

  // Shading tile flips its own mode on a second click, like the old rail.
  const activateTool = (t: EditorTool) => {
    if (t === "shading" && tool === "shading") {
      patch({ shadingMode: shadingMode === "lighten" ? "darken" : "lighten" })
      return
    }
    patch({ tool: t })
  }

  useDismissable(colorOpen, colorRef, () => setColorOpen(false))
  useDismissable(settingsOpen, settingsRef, () => setSettingsOpen(false))

  return (
    <div
      role="toolbar"
      aria-label="Editor Tools"
      className={`editor-float pointer-events-auto flex w-[68px] select-none flex-col items-center rounded-lg p-1.5 z-20 ${className}`}
    >
      {/* Tools */}
      {EDITOR_TOOL_DEFS.map((t) => {
        const active = tool === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => activateTool(t.id)}
            aria-label={`${t.label} (${t.shortcut})`}
            aria-pressed={active}
            title={`${t.label} (${t.shortcut})`}
            className={`relative ${active ? TOOL_TILE_ON : TOOL_TILE_OFF}`}
          >
            <Icon icon={t.icon} size="sm" />
            <span>
              {t.id === "shading" ? `${t.label} ${shadingMode === "lighten" ? "+" : "−"}` : t.label}
            </span>
          </button>
        )
      })}

      <RailDivider />

      {/* Undo / Redo */}
      <button
        type="button"
        onClick={() => undo?.()}
        disabled={!canUndo}
        aria-label="Undo (⌘Z)"
        title="Undo (⌘Z)"
        className={canUndo ? ICON_BTN : `${ICON_BTN} text-base-content/25 cursor-not-allowed`}
      >
        <Icon icon={ArrowCounterClockwise} size="sm" />
      </button>
      <button
        type="button"
        onClick={() => redo?.()}
        disabled={!canRedo}
        aria-label="Redo (⌘⇧Z)"
        title="Redo (⌘⇧Z)"
        className={canRedo ? ICON_BTN : `${ICON_BTN} text-base-content/25 cursor-not-allowed`}
      >
        <Icon icon={ArrowClockwise} size="sm" />
      </button>

      <RailDivider />

      {/* View toggles */}
      <button
        type="button"
        onClick={() => patch({ gridVisible: !gridVisible })}
        aria-label="Toggle Grid"
        title="Toggle Pixel Grid"
        className={`${ICON_BTN} ${gridVisible ? ICON_BTN_ON : ""}`}
      >
        <Icon icon={GridFour} size="sm" />
      </button>

      {onToggleUvDrawer ? (
        <button
          type="button"
          onClick={onToggleUvDrawer}
          aria-label="Toggle 2D UV Sheet"
          title="Toggle 2D Texture Sheet"
          className={`${ICON_BTN} ${uvDrawerOpen ? ICON_BTN_ON : ""}`}
        >
          <Icon icon={SquaresFour} size="sm" />
        </button>
      ) : null}

      {/* Settings popover (reset camera) */}
      <div className="relative w-full" ref={settingsRef}>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen((prev) => !prev)
            setColorOpen(false)
          }}
          aria-label="Settings"
          title="Editor Settings"
          className={settingsOpen ? `${ICON_BTN} ${ICON_BTN_ON} mx-auto` : `${ICON_BTN} mx-auto`}
        >
          <Icon icon={Gear} size="sm" />
        </button>

        {settingsOpen ? (
          <div
            role="dialog"
            aria-label="Editor Settings Dialog"
            className="absolute left-full top-0 ml-2 z-50 w-48 rounded-lg editor-float p-3 select-none editor-pop-in"
          >
            <div className="mb-2.5 border-b border-base-content/10 pb-1 text-xs font-bold uppercase tracking-wider text-base-content/55">
              Settings
            </div>
            {onResetCamera ? (
              <button
                type="button"
                onClick={() => {
                  onResetCamera()
                  setSettingsOpen(false)
                }}
                className="btn btn-ghost btn-sm rounded-md font-bold w-full text-base-content/70 hover:text-base-content"
              >
                Reset Camera Angle
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Pinned color block; the popover lives inside this ref so
          useDismissable keeps presses inside the picker open. */}
      <div className="relative mt-auto flex flex-col items-center gap-1 pt-1" ref={colorRef}>
        <button
          type="button"
          onClick={() => {
            setColorOpen((prev) => !prev)
            setSettingsOpen(false)
          }}
          aria-label="Color Picker"
          title="Color Palette"
          className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors cursor-pointer ${
            colorOpen ? "bg-primary/15" : "hover:bg-base-content/10"
          }`}
        >
          <span className="flex flex-col items-center gap-1">
            <span
              className="size-6 rounded-md border-2 border-base-100 shadow-xs"
              style={{ backgroundColor: primaryColor }}
              aria-hidden
            />
            <span
              className="size-4 rounded-sm border border-base-content/25 shadow-xs"
              style={{ backgroundColor: secondaryColor }}
              aria-hidden
            />
          </span>
        </button>
        <button
          type="button"
          onClick={swapColors}
          aria-label="Swap Colors (X)"
          title="Swap Colors (X)"
          className={`${ICON_BTN}`}
        >
          <Icon icon={Swap} size="sm" />
        </button>

        {/* Color Picker Popover */}
        {colorOpen ? (
          <div
            role="dialog"
            aria-label="Color Palette"
            className="absolute left-full bottom-2 ml-2 z-50 w-60 rounded-lg editor-float p-3 select-none editor-pop-in"
          >
            <div className="mb-2.5 border-b border-base-content/10 pb-1 text-xs font-bold uppercase tracking-wider text-base-content/55">
              Color Picker
            </div>
            <EditorColorPicker
              color={primaryColor}
              onChange={(hex, source) =>
                setPrimaryColor(hex, source === "drag" ? false : true)
              }
              recentColors={recentColors}
              swapColors={swapColors}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
})

