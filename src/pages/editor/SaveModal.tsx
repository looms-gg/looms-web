import { useState, type FormEvent } from "react"
import { Download, Warning, CloudArrowUp } from "@phosphor-icons/react"
import { useAuthOptional } from "../../state/auth"
import { useWardrobe } from "../../state/wardrobe"
import { useCatalog } from "../../state/catalog"
import { CLOTHING_SLOTS, type Group, type Slot } from "../../data/catalog"
import { garmentToPiece } from "../../data/garment"
import { groupsFromAtlas } from "../../skin/compose"
import { MAX_LIMITS, sanitizeText } from "../../lib/sanitize"
import { formatErrorMessage } from "../../lib/errorFormat"
import { publishGarmentTexture } from "../../components/piece/publishGarment"
import {
  exportGarmentPng,
  hasPaintedPixels,
  suggestSlot,
} from "./saveExport"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { Icon } from "../../components/ui/Icon"

export interface SaveModalProps {
  open: boolean
  onClose: () => void
  /** Returns the live 64x64 garment texture as a canvas. */
  getTextureCanvas: () => HTMLCanvasElement | null
}

type Stage = "choose" | "upload"

export default function SaveModal({
  open,
  onClose,
  getTextureCanvas,
}: SaveModalProps) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const profile = auth?.profile ?? null
  const { addToWardrobe, notify } = useWardrobe()
  const { upsert } = useCatalog()

  const [stage, setStage] = useState<Stage>("choose")
  const [slot, setSlot] = useState<Slot>("shirt")
  const [slotTouched, setSlotTouched] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function reset() {
    setStage("choose")
    setErrorMsg(null)
  }

  function handleClose() {
    onClose()
    setTimeout(() => {
      reset()
      setName("")
      setDescription("")
      setIsPublic(true)
      setSlotTouched(false)
      setSlot("shirt")
    }, 200)
  }

  function textureCanvas(): HTMLCanvasElement | null {
    return getTextureCanvas()
  }

  function paintedGroups(canvas: HTMLCanvasElement): Group[] {
    try {
      return groupsFromAtlas(canvas)
    } catch {
      return []
    }
  }

  function handleSavePng() {
    const canvas = textureCanvas()
    if (!canvas) {
      setErrorMsg("The editor is still warming up. Try again in a moment.")
      return
    }
    if (!hasPaintedPixels(canvas)) {
      setErrorMsg("This layer is empty. Paint something first.")
      return
    }
    const filename =
      sanitizeText(name, MAX_LIMITS.PIECE_NAME).replace(/\s+/g, "-") ||
      "garment-layer"
    try {
      exportGarmentPng(canvas, filename)
      setErrorMsg(null)
      handleClose()
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const canvas = textureCanvas()
    if (!canvas) {
      setErrorMsg("The editor is still warming up. Try again in a moment.")
      return
    }
    if (!user) {
      setErrorMsg("You must be logged in to upload garments.")
      return
    }
    if (!hasPaintedPixels(canvas)) {
      setErrorMsg("This layer is empty. Paint something first.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png")
      })
      if (!blob) throw new Error("Could not export the texture.")

      const painted = paintedGroups(canvas)
      const result = await publishGarmentTexture({
        userId: user.id,
        username: profile?.username ?? null,
        textureBlob: blob,
        name,
        description,
        slot,
        isPublic,
        painted,
      })

      if ("error" in result) {
        throw new Error(result.error)
      }

      const piece = garmentToPiece(result.row, result.maker)
      upsert(piece)
      addToWardrobe(result.pieceId)
      notify(`Uploaded "${piece.name}" to your wardrobe!`)
      handleClose()
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function chooseUpload() {
    const canvas = textureCanvas()
    if (canvas && !slotTouched) {
      setSlot(suggestSlot(paintedGroups(canvas)))
    }
    setStage("upload")
  }

  return (
    <ModalOverlay
      open={open}
      onClose={handleClose}
      labelledBy="save-layer-title"
      panelClassName="modal-panel relative w-full max-w-xl rounded-[18px] border border-base-content/10 bg-base-300 p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
        className="absolute right-3 top-3 grid size-8 cursor-pointer place-items-center rounded-lg text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
      >
        <span aria-hidden>×</span>
      </button>

      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary">
          <Icon icon={CloudArrowUp} size="lg" />
        </span>
        <div>
          <h2
            id="save-layer-title"
            className="text-xl font-extrabold tracking-tight text-base-content"
          >
            Save your layer
          </h2>
          <p className="text-xs text-base-content/65">
            Keep the PNG for yourself, or add it to looms.
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error/15 p-3 text-xs font-medium text-error"
        >
          <Icon icon={Warning} size="md" className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {stage === "choose" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSavePng}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border border-base-content/15 bg-base-100/60 p-6 text-center transition-colors hover:border-primary/50 hover:bg-base-100"
          >
            <Icon icon={Download} size="xl" className="text-primary/70" />
            <span className="text-sm font-extrabold text-base-content">
              Save PNG
            </span>
            <span className="text-[11px] text-base-content/55">
              A 64x64 transparent layer on your device
            </span>
          </button>
          <button
            type="button"
            onClick={chooseUpload}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border border-base-content/15 bg-base-100/60 p-6 text-center transition-colors hover:border-primary/50 hover:bg-base-100"
          >
            <Icon icon={CloudArrowUp} size="xl" className="text-primary/70" />
            <span className="text-sm font-extrabold text-base-content">
              Upload to looms
            </span>
            <span className="text-[11px] text-base-content/55">
              Add it to your wardrobe, public or private
            </span>
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleUpload}>
          <div>
            <label className="mb-1 block text-xs font-bold text-base-content/80">
              Piece Name
            </label>
            <input
              name="name"
              type="text"
              required
              maxLength={MAX_LIMITS.PIECE_NAME}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cyberpunk Bomber"
              className="input input-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-base-content/80">
                Slot
              </label>
              <select
                name="slot"
                value={slot}
                onChange={(e) => {
                  setSlot(e.target.value as Slot)
                  setSlotTouched(true)
                }}
                className="select select-bordered w-full rounded-xl bg-base-100 text-sm capitalize focus:border-primary"
              >
                {CLOTHING_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-base-content/80">
                Visibility
              </label>
              <select
                value={isPublic ? "public" : "private"}
                onChange={(e) => setIsPublic(e.target.value === "public")}
                className="select select-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary"
              >
                <option value="public">Public (Community)</option>
                <option value="private">Private (Only You)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-base-content/80">
              Description <span className="font-normal text-base-content/50">(Optional)</span>
            </label>
            <textarea
              value={description}
              maxLength={MAX_LIMITS.PIECE_DESCRIPTION}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short notes about style, palette, or inspiration..."
              rows={2}
              className="textarea textarea-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn btn-ghost flex-1 rounded-full font-bold"
              onClick={() => setStage("choose")}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1 rounded-full font-extrabold tracking-wide"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Publish Piece"
              )}
            </button>
          </div>
        </form>
      )}
    </ModalOverlay>
  )
}
