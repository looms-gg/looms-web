import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { FloppyDisk, PaintBrush, Stack, User } from "@phosphor-icons/react"
import { Icon } from "../components/ui/Icon"
import { useIsMobile } from "../components/ui/useIsMobile"
import { getPiece, type Piece } from "../data/catalog"
import { useAuthOptional } from "../state/auth"
import { EditorGate } from "./editor/EditorGate"
import { EditorPartsPanel } from "./editor/EditorPartsPanel"
import { EditorStage } from "./editor/EditorStage"
import { EditorToolRail } from "./editor/EditorToolRail"
import { SaveExportModal } from "./editor/SaveExportModal"
import { useSkinEditor, type SkinEditorState } from "./editor/useSkinEditor"

type MobileEditorTab = "tools" | "stage" | "parts"

function usePieceSession(
  pieceId: string | null,
  userId: string | null,
  loadPiece: SkinEditorState["loadPiece"],
): { pieceSession: Piece | null; sessionNotice: string | null } {
  const [pieceSession, setPieceSession] = useState<Piece | null>(null)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!pieceId) return
    const piece = getPiece(pieceId)
    if (!piece) {
      setSessionNotice("You can only edit pieces you uploaded.")
      return
    }
    if (!userId || piece.userId !== userId) {
      setSessionNotice("You can only edit pieces you uploaded.")
      return
    }
    setSessionNotice(null)
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const c = document.createElement("canvas")
      c.width = 64
      c.height = 64
      const ctx = c.getContext("2d")
      if (!ctx) {
        setSessionNotice("Could not load that piece's texture.")
        return
      }
      ctx.drawImage(img, 0, 0, 64, 64)
      setPieceSession(piece)
      loadPiece(piece, c)
    }
    img.onerror = () => {
      if (!cancelled) setSessionNotice("Could not load that piece's texture.")
    }
    img.src = piece.skin
    return () => {
      cancelled = true
    }
  }, [pieceId, userId, loadPiece])

  return { pieceSession, sessionNotice }
}

export function EditorPage() {
  const editor = useSkinEditor()
  const isMobile = useIsMobile()
  const [saveOpen, setSaveOpen] = useState(false)
  const [uvDrawerOpen, setUvDrawerOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileEditorTab>("stage")

  const [searchParams] = useSearchParams()
  const pieceId = searchParams.get("piece")
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { pieceSession, sessionNotice } = usePieceSession(
    pieceId,
    user?.id ?? null,
    editor.loadPiece,
  )
  // Fresh sessions open on the gate; a piece id in the URL skips straight to
  // the workspace. Choosing import navigates here with a piece id, which
  // closes the gate without extra state.
  const [gateOpen, setGateOpen] = useState(true)
  const gateVisible = pieceId === null && gateOpen

  const sessionNoticeNode = sessionNotice ? (
    <div
      role="status"
      className={
        isMobile
          ? "rounded-xl bg-base-200 border border-base-content/15 px-3 py-2 text-xs font-bold text-base-content/70"
          : "pointer-events-none absolute left-3 top-3 z-30 max-w-xs rounded-xl bg-base-200 border border-base-content/15 px-3 py-2 text-xs font-bold text-base-content/70"
      }
    >
      {sessionNotice}
    </div>
  ) : null

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    } catch {
      window.scrollTo(0, 0)
    }
    if (document.documentElement) document.documentElement.scrollTop = 0
    if (document.body) document.body.scrollTop = 0
  }, [])

  if (gateVisible) {
    return <EditorGate editor={editor} onDone={() => setGateOpen(false)} />
  }

  if (isMobile) {
    return (
      <div className="studio-mobile-shell">
        <div className="studio-mobile-stage">
          {sessionNoticeNode}
          <div className="studio-mobile-panel" key={mobileTab}>
            {mobileTab === "tools" && <EditorToolRail editor={editor} />}
            {mobileTab === "stage" && (
              <EditorStage
                editor={editor}
                uvDrawerOpen={uvDrawerOpen}
                onToggleUvDrawer={() => setUvDrawerOpen((o) => !o)}
                onOpenSave={() => setSaveOpen(true)}
              />
            )}
            {mobileTab === "parts" && <EditorPartsPanel editor={editor} />}
          </div>
        </div>

        {/* Mobile Navigation matching Studio */}
        <nav
          className="studio-mobile-nav studio-mobile-nav--4"
          aria-label="Editor sections"
        >
          <button
            type="button"
            data-testid="editor-mobile-tab-tools"
            aria-pressed={mobileTab === "tools"}
            aria-label="Tools"
            className={`studio-mobile-tab${
              mobileTab === "tools" ? " studio-mobile-tab--active" : ""
            }`}
            onClick={() => setMobileTab("tools")}
          >
            <Icon icon={PaintBrush} />
            Tools
          </button>
          <button
            type="button"
            data-testid="editor-mobile-tab-stage"
            aria-pressed={mobileTab === "stage"}
            aria-label="3D Stage"
            className={`studio-mobile-tab${
              mobileTab === "stage" ? " studio-mobile-tab--active" : ""
            }`}
            onClick={() => setMobileTab("stage")}
          >
            <Icon icon={User} />
            Stage
          </button>
          <button
            type="button"
            data-testid="editor-mobile-tab-parts"
            aria-pressed={mobileTab === "parts"}
            aria-label="Limbs"
            className={`studio-mobile-tab${
              mobileTab === "parts" ? " studio-mobile-tab--active" : ""
            }`}
            onClick={() => setMobileTab("parts")}
          >
            <Icon icon={Stack} />
            Limbs
          </button>
          <button
            type="button"
            data-testid="editor-mobile-tab-save"
            aria-label="Save & Export"
            className="studio-mobile-tab editor-save-tab"
            onClick={() => setSaveOpen(true)}
          >
            <Icon icon={FloppyDisk} />
            Save
          </button>
        </nav>

        {/* Save & Export Modal */}
        {/* Draft resume prompt */}
        <SaveExportModal
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          paintCanvas={editor.paintCanvas}
          session={pieceSession ? { kind: "piece", piece: pieceSession } : { kind: "fresh" }}
          portal={true}
        />
      </div>
    )
  }

  return (
    <div className="editor-shell relative flex w-full min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2 md:flex-row md:overflow-hidden md:p-3">
      {sessionNoticeNode}
      <EditorStage
        editor={editor}
        uvDrawerOpen={uvDrawerOpen}
        onToggleUvDrawer={() => setUvDrawerOpen((o) => !o)}
        onOpenSave={() => setSaveOpen(true)}
      />

      {/* Save & Export Modal */}
      <SaveExportModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        paintCanvas={editor.paintCanvas}
        session={pieceSession ? { kind: "piece", piece: pieceSession } : { kind: "fresh" }}
        portal={true}
      />
    </div>
  )
}
