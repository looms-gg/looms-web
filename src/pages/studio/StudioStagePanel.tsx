import { useEffect, type FormEvent } from "react"
import { Download } from "@phosphor-icons/react"
import type { Piece } from "../../data/catalog"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { CloseButton } from "../../components/ui/CloseButton"
import { SkinStage } from "../../components/iso/SkinStage"
import type { SkinModel } from "../../skin/convert"
import type { Look } from "../../state/wardrobe"
import { MAX_LIMITS } from "../../lib/sanitize"
import { Icon } from "../../components/ui/Icon"

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
    <section className="studio-stage rounded-2xl bg-base-200 border border-base-content/10 p-4 md:p-5">
      <div className="studio-stage-head">
        <h1 className="text-lg font-black tracking-tight text-base-content/90">Studio</h1>
      </div>
      <div className="studio-stage-view">
        <SkinStage
          outfit={outfit}
          bodyId={bodyId}
          bodyHue={bodyHue}
          model={model}
          fullFigure
          className="h-full rounded-2xl"
        />
      </div>
      <div className="mt-3 flex justify-center studio-stage-save">
        <form
          onSubmit={onSave}
          className="studio-stage-form flex w-full max-w-sm items-center gap-1.5 rounded-2xl bg-base-300/90 p-1.5 border border-base-content/12 shadow-xl backdrop-blur-md"
        >
          <input
            value={name}
            maxLength={MAX_LIMITS.LOOK_NAME}
            onChange={(event) => onName(event.target.value)}
            className="input input-ghost h-9 min-w-0 flex-1 px-3 text-xs sm:text-sm font-semibold rounded-xl focus:bg-transparent focus:outline-none placeholder:text-base-content/40 text-base-content"
            placeholder="Name this look"
            aria-label="Look name"
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm h-9 min-h-9 rounded-xl px-4 font-black text-xs shadow-xs"
          >
            Save to Wardrobe
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm h-9 min-h-9 rounded-xl px-2.5 text-xs font-bold text-base-content/70 hover:text-base-content hover:bg-base-200/80 border border-base-content/10 flex items-center gap-1"
            onClick={onDownload}
            title="Download PNG"
            aria-label="Download PNG"
          >
            <Icon icon={Download} size="xs" />
          </button>
        </form>
      </div>

      <ModalOverlay
        open={Boolean(confirmOverwriteLook)}
        onClose={onCancelOverwrite}
        labelledBy="overwrite-dialog-title"
        portal={false}
        scrimClassName="modal-scrim modal-scrim-soft"
        panelClassName="modal-panel relative w-full max-w-md rounded-3xl bg-base-200 border border-base-content/10 p-6 shadow-2xl space-y-4"
      >
        <CloseButton onClick={() => onCancelOverwrite?.()} className="absolute right-3 top-3" />
        <h2 id="overwrite-dialog-title" className="pr-8 text-lg font-extrabold">
          You already have a look with this name.
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
