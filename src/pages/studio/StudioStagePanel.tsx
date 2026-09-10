import { useEffect, type FormEvent } from "react"
import type { Piece } from "../../data/catalog"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { SkinStage } from "../../components/iso/SkinStage"
import type { SkinModel } from "../../skin/convert"
import type { Look } from "../../state/wardrobe"
import { MAX_LIMITS } from "../../lib/sanitize"

export function StudioStagePanel({
  outfit,
  bodyId,
  bodyHue,
  model,
  name,
  onName,
  onSave,
  onDownload,
  confirmOverwriteLook,
  onConfirmOverwrite,
  onSaveAsNew,
  onCancelOverwrite,
}: {
  outfit: Piece[]
  bodyId: string
  bodyHue: number
  model: SkinModel
  name: string
  onName: (name: string) => void
  onSave: (event: FormEvent) => void
  onDownload: () => void | Promise<void>
  confirmOverwriteLook?: Look | null
  onConfirmOverwrite?: () => void
  onSaveAsNew?: () => void
  onCancelOverwrite?: () => void
}) {
  useEffect(() => {
    if (!confirmOverwriteLook) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelOverwrite?.()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [confirmOverwriteLook, onCancelOverwrite])

  return (
    <section className="studio-stage rounded-[18px] bg-base-200 p-4 md:p-5">
      <div className="studio-stage-head">
        <h1 className="text-2xl font-extrabold tracking-tight">Studio</h1>
      </div>
      <div className="studio-stage-view">
        <SkinStage
          outfit={outfit}
          bodyId={bodyId}
          bodyHue={bodyHue}
          model={model}
          fullFigure
          className="h-full rounded-[18px]"
        />
      </div>
      <div className="mt-3 flex justify-center studio-stage-save">
        <form
          onSubmit={onSave}
          className="studio-stage-form flex w-full max-w-xs sm:max-w-sm items-center gap-1.5 rounded-full bg-base-100 p-1 border border-white/10 shadow-sm"
        >
          <input
            value={name}
            maxLength={MAX_LIMITS.LOOK_NAME}
            onChange={(event) => onName(event.target.value)}
            className="input input-ghost h-8 min-w-0 flex-1 px-3 text-sm font-semibold rounded-full focus:bg-transparent focus:outline-none placeholder:text-base-content/40"
            placeholder="Name this look"
            aria-label="Look name"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm h-8 min-h-8 rounded-full px-3.5 font-extrabold text-xs"
          >
            Save
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm h-8 min-h-8 rounded-full px-2.5 text-xs font-bold text-base-content/70 hover:text-base-content"
            onClick={onDownload}
            title="Download PNG"
          >
            PNG
          </button>
        </form>
      </div>

      <ModalOverlay
        open={Boolean(confirmOverwriteLook)}
        onClose={onCancelOverwrite}
        labelledBy="overwrite-dialog-title"
        portal={false}
        scrimClassName="modal-scrim modal-scrim-soft"
        panelClassName="modal-panel w-full max-w-md rounded-[20px] bg-base-200 border border-white/10 p-6 shadow-2xl space-y-4"
      >
        <h2 id="overwrite-dialog-title" className="text-lg font-extrabold">
          This skin seems to already exist!
        </h2>
        <p className="text-sm text-base-content/75 leading-relaxed">
          A skin named{" "}
          <span className="font-bold text-base-content">
            "{confirmOverwriteLook?.name}"
          </span>{" "}
          already exists in your wardrobe. Would you like to overwrite it?
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm rounded-full font-bold"
            onClick={onCancelOverwrite}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-sm rounded-full font-bold"
            onClick={onSaveAsNew}
          >
            Save as new
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-full font-extrabold"
            onClick={onConfirmOverwrite}
          >
            Overwrite
          </button>
        </div>
      </ModalOverlay>
    </section>
  )
}
