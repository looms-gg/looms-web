import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { CaretDown, Download, Sparkle } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { DROPDOWN_MENU } from "../../components/ui/Dropdown"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { CloseButton } from "../../components/ui/CloseButton"
import {
  CLOTHING_SLOTS,
  SLOT_LABEL,
  type Slot,
} from "../../data/catalog"
import type { PaintSession } from "./useSkinEditor"
import { MAX_LIMITS, sanitizeText } from "../../lib/sanitize"
import { useWardrobe } from "../../state/wardrobe"
import { useCatalog } from "../../state/catalog"
import { useAuthOptional } from "../../state/auth"
import { downloadCanvasAsPng } from "./tools/garmentExtract"
import { clearEditorDraft } from "./tools/editorDraft"
import { publishGarmentTexture } from "../../lib/piecePublish/publishGarment"
import { overwritePieceTexture } from "../../lib/piecePublish/overwritePieceTexture"
import { groupsFromAtlas } from "../../skin/compose"
import { garmentToPiece } from "../../data/garment"
import { formatErrorMessage } from "../../lib/errorFormat"

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
}

export function SaveExportModal({
  open,
  onClose,
  paintCanvas,
  session,
  portal = false,
}: {
  open: boolean
  onClose: () => void
  paintCanvas: HTMLCanvasElement
  session: PaintSession
  portal?: boolean
}) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const profile = auth?.profile ?? null
  const navigate = useNavigate()
  const wardrobe = useWardrobe()
  const { upsert } = useCatalog()

  const piece = session.kind === "piece" ? session.piece : null
  const [mode, setMode] = useState<"primary" | "publish">("primary")
  const [menuOpen, setMenuOpen] = useState(false)
  const [garmentName, setGarmentName] = useState("")
  const [description, setDescription] = useState("")
  const [slot, setSlot] = useState<Slot>("shirt")
  const [isPublic, setIsPublic] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const view: "publish" | "overwrite" =
    piece && mode === "primary" ? "overwrite" : "publish"

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault()
    const clean =
      sanitizeText(garmentName || piece?.name || "my-garment", MAX_LIMITS.PIECE_NAME) ||
      "my-garment"
    downloadCanvasAsPng(paintCanvas, clean)
    setMenuOpen(false)
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setErrorMsg(null)
    try {
      const clean = sanitizeText(garmentName, MAX_LIMITS.PIECE_NAME) || "Untitled Piece"
      const blob = await canvasToBlob(paintCanvas)
      if (!blob) throw new Error("Could not read the painted texture.")
      const painted = groupsFromAtlas(paintCanvas)
      const result = await publishGarmentTexture({
        userId: user.id,
        username: profile?.username,
        textureBlob: blob,
        name: clean,
        description,
        slot,
        isPublic,
        painted,
      })
      if ("error" in result) {
        setErrorMsg(formatErrorMessage(result.error))
        return
      }
      upsert(garmentToPiece(result.row, result.maker))
      await wardrobe.addToWardrobe(result.pieceId, { notify: false })
      wardrobe.notify(`Published "${result.row.name}"!`)
      clearEditorDraft()
      onClose()
      navigate(`/piece/${result.pieceId}`)
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleOverwrite = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!piece || !piece.userId) return
    setBusy(true)
    setErrorMsg(null)
    try {
      const blob = await canvasToBlob(paintCanvas)
      if (!blob) throw new Error("Could not read the painted texture.")
      const painted = groupsFromAtlas(paintCanvas)
      const result = await overwritePieceTexture({
        userId: piece.userId,
        pieceId: piece.id,
        slot: piece.slot,
        textureBlob: blob,
        painted,
      })
      if ("error" in result) {
        setErrorMsg(formatErrorMessage(result.error))
        return
      }
      upsert(result.piece)
      wardrobe.notify(`"${result.piece.name}" updated!`)
      onClose()
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      labelledBy="save-export-modal-title"
      portal={portal}
      scrimClassName="modal-scrim modal-scrim-soft"
      panelClassName="modal-panel relative w-full max-w-lg rounded-[22px] bg-base-200 border border-base-content/15 p-6 shadow-2xl space-y-4 text-base-content"
    >
      <CloseButton onClick={onClose} className="absolute right-4 top-4" />

      <div>
        <h2 id="save-export-modal-title" className="text-xl font-extrabold tracking-tight">
          {piece ? piece.name : "Publish your piece"}
        </h2>
        <p className="text-xs text-base-content/60 mt-0.5">
          {piece
            ? "Your edits replace this piece's texture. Likes and saves are kept."
            : "Share what you painted with the catalog, or keep it to yourself."}
        </p>
      </div>

      {!user ? (
        <p className="rounded-xl bg-base-300/60 px-3 py-2 text-xs font-bold text-base-content/70">
          Sign in to publish and overwrite pieces.
        </p>
      ) : null}

      {errorMsg ? (
        <p
          role="alert"
          className="rounded-xl bg-error/10 px-3 py-2 text-xs font-bold text-error"
        >
          {errorMsg}
        </p>
      ) : null}

      {view === "publish" && user ? (
        <form onSubmit={handlePublish} className="space-y-4 pt-1">
          <div>
            <label
              htmlFor="garment-name"
              className="block text-xs font-bold text-base-content/70 mb-1.5"
            >
              Piece Name
            </label>
            <input
              id="garment-name"
              type="text"
              value={garmentName}
              maxLength={MAX_LIMITS.PIECE_NAME}
              onChange={(e) => setGarmentName(e.target.value)}
              placeholder={`e.g. Cozy ${SLOT_LABEL[slot]}`}
              className="input input-bordered w-full rounded-xl bg-base-100 text-sm font-semibold"
              required
            />
          </div>

          <div>
            <label
              htmlFor="garment-description"
              className="block text-xs font-bold text-base-content/70 mb-1.5"
            >
              Description <span className="font-normal text-base-content/50">(optional)</span>
            </label>
            <textarea
              id="garment-description"
              value={description}
              maxLength={MAX_LIMITS.PIECE_DESCRIPTION}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you make? How does it wear?"
              rows={3}
              className="textarea textarea-bordered w-full rounded-xl bg-base-100 text-sm font-medium resize-none"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-base-content/70 mb-1.5">
              What kind of piece is it?
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {CLOTHING_SLOTS.map((s) => {
                const active = slot === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={`btn btn-xs h-8 min-h-0 rounded-lg font-bold border-0 ${
                      active
                        ? "btn-primary shadow-xs"
                        : "btn-ghost bg-base-300 text-base-content/70"
                    }`}
                  >
                    {SLOT_LABEL[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="checkbox checkbox-primary checkbox-xs rounded"
            />
            <span className="text-xs font-semibold text-base-content/80">
              Show it in the public catalog
            </span>
          </label>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="More export options"
                className="btn btn-ghost btn-sm h-8 min-h-8 rounded-full px-2.5 font-bold text-base-content/70 hover:text-base-content"
              >
                <Icon icon={CaretDown} size="xs" />
                More
              </button>
              {menuOpen ? (
                <div className={`absolute bottom-full left-0 mb-2 z-50 w-44 ${DROPDOWN_MENU}`}>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-semibold rounded-lg text-base-content/70 hover:bg-base-300/60 hover:text-base-content transition-colors cursor-pointer"
                  >
                    <Icon icon={Download} size="xs" />
                    <span>Download PNG</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary btn-sm rounded-full font-extrabold gap-1.5 px-4"
            >
              <Icon icon={Sparkle} size="sm" />
              <span>{busy ? "Publishing..." : "Publish"}</span>
            </button>
          </div>
        </form>
      ) : null}

      {view === "overwrite" && piece ? (
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="More export options"
                className="btn btn-ghost btn-sm h-8 min-h-8 rounded-full px-2.5 font-bold text-base-content/70 hover:text-base-content"
              >
                <Icon icon={CaretDown} size="xs" />
                More
              </button>
              {menuOpen ? (
                <div className={`absolute bottom-full left-0 mb-2 z-50 w-48 ${DROPDOWN_MENU}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("publish")
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-semibold rounded-lg text-base-content/70 hover:bg-base-300/60 hover:text-base-content transition-colors cursor-pointer"
                  >
                    <Icon icon={Sparkle} size="xs" />
                    <span>Save as new piece</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-semibold rounded-lg text-base-content/70 hover:bg-base-300/60 hover:text-base-content transition-colors cursor-pointer"
                  >
                    <Icon icon={Download} size="xs" />
                    <span>Download PNG</span>
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleOverwrite}
              disabled={busy}
              className="btn btn-primary btn-sm rounded-full font-extrabold gap-1.5 px-4"
            >
              <Icon icon={Sparkle} size="sm" />
              <span>{busy ? "Saving..." : "Overwrite piece"}</span>
            </button>
          </div>
        </div>
      ) : null}
    </ModalOverlay>
  )
}
