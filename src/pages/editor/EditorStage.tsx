import { useCallback, useRef, useState } from "react"
import type { SkinViewer } from "skinview3d"
import { RIM_OPACITY } from "../../skin/stageFx"
import type { SkinEditorState } from "./useSkinEditor"
import { useEditorViewer } from "./useEditorViewer"
import { useEditorPaintHandlers } from "./useEditorPaintHandlers"
import { EditorUvDrawer } from "./EditorUvDrawer"
import { EditorToolbar } from "./EditorToolbar"
import { EditorQuickPalette } from "./EditorQuickPalette"
import { EditorOptionsBar } from "./EditorOptionsBar"
import { EditorActionBar } from "./EditorActionBar"
import { RotationGizmo } from "./RotationGizmo"
import { DesktopPartFilter } from "./DesktopPartFilter"

export function EditorStage({
  editor,
  uvDrawerOpen,
  onToggleUvDrawer,
  onOpenSave,
  className = "",
}: {
  editor: SkinEditorState
  uvDrawerOpen: boolean
  onToggleUvDrawer: () => void
  onOpenSave?: () => void
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fxRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const viewerRef = useRef<SkinViewer | null>(null)
  const scheduleRef = useRef<() => void>(() => {})
  // Per-frame pointer work (raycast, stroke, preview), drained by the
  // viewer's frame loop before it renders.
  const frameWorkRef = useRef<(() => void) | null>(null)
  const scheduleFrame = useCallback(() => {
    scheduleRef.current()
  }, [])
  const [viewerInstance, setViewerInstance] = useState<SkinViewer | null>(null)
  const [ready, setReady] = useState(false)

  const { gridVisible } = editor.brush.data
  const { data: visibilityData } = editor.visibility
  const { bodyParts, armorParts } = visibilityData

  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  } = useEditorPaintHandlers({
    editor,
    viewerRef,
    canvasRef,
    viewerInstance,
    scheduleFrame,
    frameWorkRef,
    bodyParts,
    armorParts,
  })

  const { resetCamera } = useEditorViewer({
    canvasRef,
    fxRefs,
    viewerRef,
    scheduleRef,
    frameWorkRef,
    viewerInstance,
    setViewerInstance,
    setReady,
    bufferCanvas: editor.bufferCanvas,
    model: editor.model,
    bodyParts,
    armorParts,
    gridVisible,
    subscribeTextureUpdate: editor.subscribeTextureUpdate,
  })

  return (
    <section
      className={`editor-stage relative flex flex-col flex-1 h-full w-full min-h-[520px] overflow-hidden select-none bg-base-200 ${className}`}
    >
      {/* Panel head: Photoshop-style Brush Options Bar, framed like the studio head */}
      <EditorOptionsBar editor={editor} className="editor-stage-head" />

      <div className="relative min-h-0 flex-1">
        {/* 3D Canvas Viewport: inset well, framed like the studio stage view */}
        <div className="editor-stage-well absolute inset-0 z-0 m-2 overflow-hidden rounded-lg md:m-3">
          {!ready && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/90">
              <span className="loading loading-spinner text-primary" />
            </div>
          )}

          <canvas
            ref={(node) => {
              fxRefs.current[0] = node
            }}
            className="skin-stage-fx iso-thumb-shadow"
            aria-hidden
          />

          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerLeave}
            className="skin-stage-canvas h-full w-full touch-none cursor-crosshair"
          />

          <canvas
            ref={(node) => {
              fxRefs.current[1] = node
            }}
            className="skin-stage-fx iso-thumb-rim"
            style={{ opacity: RIM_OPACITY }}
            aria-hidden
          />
        </div>

        {/* Docked vertical tool rail on the left */}
        <EditorToolbar
          editor={editor}
          uvDrawerOpen={uvDrawerOpen}
          onToggleUvDrawer={onToggleUvDrawer}
          onResetCamera={resetCamera}
          className="absolute left-3 top-3 bottom-3 z-40 h-[calc(100%-1.5rem)]"
        />

        {/* Floating Top-Right Overlay: 3D Rotation Gizmo + Dual Silhouette Filter */}
        <div className="absolute right-0 top-0 mr-4 mt-4 z-20 hidden md:flex flex-col items-center gap-3 select-none">
          <div className="editor-float flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-full bg-base-200 hover:bg-base-300 transition-colors pointer-events-auto">
            <RotationGizmo viewer={viewerInstance} size={96} />
          </div>
          <DesktopPartFilter editor={editor} />
        </div>

        {/* 2D UV Drawer as Overlay */}
        <EditorUvDrawer
          editor={editor}
          open={uvDrawerOpen}
          onClose={onToggleUvDrawer}
        />

        {/* Quick palette docked next to the rail */}
        <EditorQuickPalette editor={editor} />
      </div>

      {/* Bottom Action Bar (MineSkin 1:1) */}
      <EditorActionBar
        onOpenSave={onOpenSave}
      />
    </section>
  )
}
