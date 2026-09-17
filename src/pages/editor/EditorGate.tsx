import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CaretRight, PencilSimpleLine, Swap, UploadSimple } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { CloseButton } from "../../components/ui/CloseButton"
import { SLOT_LABEL } from "../../data/catalog"
import { useCatalog } from "../../state/catalog"
import { useAuthOptional } from "../../state/auth"
import type { SkinEditorState } from "./useSkinEditor"

export function EditorGate({ editor, onDone }: { editor: SkinEditorState; onDone: () => void }) {
  const navigate = useNavigate()
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { pieces } = useCatalog()
  const [pickerOpen, setPickerOpen] = useState(false)

  const ownPieces = user
    ? pieces.filter((piece) => piece.userId === user.id)
    : []

  const startFresh = () => {
    if (editor.pendingDraft) editor.discardDraft()
    onDone()
  }

  const resumeDraft = () => {
    editor.restoreDraft()
    onDone()
  }

  const importPiece = (pieceId: string) => {
    navigate(`/editor?piece=${pieceId}`)
  }

  const gateRow = "gate-row group"

  return (
    <div
      className="flex w-full flex-1 items-center justify-center p-4"
      data-testid="editor-gate"
    >
      <div className="w-full max-w-3xl">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_23rem] md:gap-12">
          <div className="gate-intro space-y-2 text-center md:text-left">
            <h1 className="text-4xl font-black tracking-tight text-base-content md:text-5xl">
              Paint a piece
            </h1>
            <p className="mx-auto max-w-sm text-base font-semibold text-pretty text-[color:var(--ink-muted)] md:mx-0 md:text-lg">
              Draw one from a blank texture, or open an upload and rework it.
            </p>
          </div>

          <div className="gate-actions mx-auto w-full max-w-sm space-y-2.5 md:mx-0 md:max-w-none">
            <button type="button" data-testid="editor-gate-fresh" onClick={startFresh} className={gateRow}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Icon icon={PencilSimpleLine} size="sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-base-content">Start fresh</span>
                <span className="block text-xs font-semibold text-[color:var(--ink-muted)]">
                  A blank texture, every tool ready.
                </span>
              </span>
              <Icon
                icon={CaretRight}
                className="hidden shrink-0 text-[color:var(--ink-muted)] opacity-60 transition-opacity group-hover:opacity-100 sm:block"
              />
            </button>

            <button
              type="button"
              data-testid="editor-gate-import"
              onClick={() => setPickerOpen(true)}
              disabled={!user}
              className={gateRow}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/15 text-secondary">
                <Icon icon={UploadSimple} size="sm" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-base-content">
                  Import a piece
                </span>
                <span className="block text-xs font-semibold text-[color:var(--ink-muted)]">
                  {user
                    ? "Rework something you uploaded before."
                    : "Sign in to rework your uploads."}
                </span>
              </span>
              <Icon
                icon={CaretRight}
                className="hidden shrink-0 text-[color:var(--ink-muted)] opacity-60 transition-opacity group-hover:opacity-100 sm:block"
              />
            </button>

            {editor.pendingDraft ? (
              <button
                type="button"
                data-testid="editor-gate-resume"
                onClick={resumeDraft}
                className={gateRow}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <Icon icon={Swap} size="sm" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-base-content">
                    Resume draft
                  </span>
                  <span className="block text-xs font-semibold text-[color:var(--ink-muted)]">
                    Your last session is still here.
                  </span>
                </span>
                <Icon
                  icon={CaretRight}
                  className="hidden shrink-0 text-[color:var(--ink-muted)] opacity-60 transition-opacity group-hover:opacity-100 sm:block"
                />
              </button>
            ) : null}
          </div>
        </div>

      </div>

      <ModalOverlay
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        labelledBy="editor-gate-picker-title"
        panelClassName="modal-panel relative w-full max-w-lg rounded-[22px] bg-base-200 border border-base-content/15 p-6 shadow-2xl text-base-content max-h-[80vh] overflow-y-auto"
      >
        <CloseButton onClick={() => setPickerOpen(false)} className="absolute right-4 top-4" />
        <h2
          id="editor-gate-picker-title"
          className="text-lg font-extrabold tracking-tight"
        >
          Pick a piece to rework
        </h2>
        <p className="text-xs text-base-content/60 mt-0.5">
          Your uploads load straight into the editor.
        </p>

        {ownPieces.length === 0 ? (
          <p className="rounded-xl bg-base-300/60 px-3 py-4 text-center text-xs font-bold text-base-content/60 mt-4">
            You haven't uploaded any pieces yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {ownPieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                onClick={() => importPiece(piece.id)}
                className="rounded-xl bg-base-100 border border-base-content/10 px-3 py-2.5 text-left hover:border-primary/60 transition-colors cursor-pointer"
              >
                <span className="block text-sm font-bold truncate">{piece.name}</span>
                <span className="block text-[11px] font-semibold text-base-content/50">
                  {SLOT_LABEL[piece.slot]}
                </span>
              </button>
            ))}
          </div>
        )}
      </ModalOverlay>
    </div>
  )
}
