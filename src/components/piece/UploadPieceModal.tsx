import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react"
import {
  CloudArrowUp,
  Warning,
  Check,
} from "@phosphor-icons/react"
import { useAuthOptional } from "../../state/auth"
import { useWardrobe } from "../../state/wardrobe"
import { useCatalog } from "../../state/catalog"
import { CLOTHING_SLOTS, type Group, type Slot } from "../../data/catalog"
import { garmentToPiece } from "../../data/garment"
import { groupsFromAtlas } from "../../skin/compose"
import {
  MAX_LIMITS,
  sanitizeText,
} from "../../lib/sanitize"
import { formatErrorMessage } from "../../lib/errorFormat"
import { validatePngTexture } from "../../lib/textureValidation"
import { publishGarmentTexture } from "../../lib/piecePublish/publishGarment"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import { Dropdown } from "../ui/Dropdown"
import { ModalOverlay } from "../ui/ModalOverlay"

export interface UploadPieceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UploadPieceModal({ isOpen, onClose }: UploadPieceModalProps) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const profile = auth?.profile ?? null
  const { addToWardrobe, notify } = useWardrobe()
  const { upsert } = useCatalog()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [painted, setPainted] = useState<Group[]>([])
  const [slot, setSlot] = useState<Slot>("shirt")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null)
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const result = await validatePngTexture(selectedFile)
    if (!result.ok) {
      setErrorMsg(result.error)
      return
    }
    const { objectUrl, img } = result

    setFile(selectedFile)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return objectUrl
    })
    setPainted([])
    const stamp = document.createElement("canvas")
    stamp.width = 64
    stamp.height = 64
    const stampCtx = stamp.getContext("2d", { willReadFrequently: true })
    if (stampCtx) {
      stampCtx.drawImage(img, 0, 0, 64, 64)
      setPainted(groupsFromAtlas(stamp))
    }
    if (!name) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      const cleanDefaultName = sanitizeText(
        baseName.charAt(0).toUpperCase() + baseName.slice(1),
        MAX_LIMITS.PIECE_NAME,
      )
      setName(cleanDefaultName)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setErrorMsg("You must be logged in to upload garments.")
      return
    }
    if (!file) {
      setErrorMsg("Please select a 64x64 PNG clothing texture.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const pieceName = sanitizeText(name, MAX_LIMITS.PIECE_NAME) || "Untitled Piece"

    try {
      const result = await publishGarmentTexture({
        userId: user.id,
        username: profile?.username ?? null,
        textureBlob: file,
        name,
        description,
        slot,
        isPublic,
        painted,
      })

      if ("error" in result) {
        throw result.error
      }

      upsert(garmentToPiece(result.row, result.maker))
      addToWardrobe(result.pieceId)
      notify(`Uploaded "${pieceName}" to your wardrobe!`)
      onClose()
    } catch (err: unknown) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalOverlay
      open={isOpen}
      onClose={onClose}
      labelledBy="upload-piece-title"
      panelClassName="modal-panel relative w-full max-w-xl rounded-[18px] border border-base-content/10 bg-base-300 p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
    >
        <CloseButton onClick={onClose} className="absolute right-3 top-3" />

        <div className="flex items-center gap-3 mb-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary">
            <Icon icon={CloudArrowUp} size="lg" />
          </span>
          <div>
            <h2
              id="upload-piece-title"
              className="text-xl font-extrabold tracking-tight text-base-content"
            >
              Upload Garment Piece
            </h2>
            <p className="text-xs text-base-content/65">
              Upload a 64x64 transparent PNG Minecraft clothing layer.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl bg-error/15 border border-error/30 p-3 text-xs text-error font-medium"
          >
            <Icon icon={Warning} size="md" className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* File input / drag box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-base-content/15 hover:border-primary/50 rounded-[18px] cursor-pointer bg-base-100/50 hover:bg-base-100 transition-colors text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={handleFileChange} />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Texture preview"
                  className="size-24 rounded-lg bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[size:16px_16px] object-contain p-1 border border-base-content/10 [image-rendering:pixelated]" />
                <span className="text-xs font-bold text-success flex items-center gap-1">
                  <Icon icon={Check} size="xs" />
                  {file?.name} (64x64)
                </span>
                <span className="text-[11px] text-base-content/50">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-base-content/65">
                <Icon icon={CloudArrowUp} size="xl" className="text-primary/70 mb-1" />
                <span className="text-xs font-bold text-base-content">
                  Click or drag a 64x64 PNG here
                </span>
                <span className="text-[11px] text-base-content/50">
                  Transparent areas let the skin show through
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-base-content/80 mb-1">
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
              className="input input-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-base-content/80 mb-1">Slot</label>
              <Dropdown
                className="w-full"
                ariaLabel="Slot"
                value={slot}
                onChange={(value) => setSlot(value)}
                options={CLOTHING_SLOTS.map((s) => ({ id: s, label: s }))}
                itemClassName={(_option) => "capitalize"}
                menuClassName="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-base-content/80 mb-1">
                Visibility
              </label>
              <Dropdown
                className="w-full"
                ariaLabel="Visibility"
                value={isPublic ? "public" : "private"}
                onChange={(value) => setIsPublic(value === "public")}
                options={[
                  { id: "public", label: "Public (Community)" },
                  { id: "private", label: "Private (Only You)" },
                ]}
                menuClassName="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-base-content/80 mb-1">
              Description <span className="font-normal text-base-content/50">(Optional)</span>
            </label>
            <textarea
              value={description}
              maxLength={MAX_LIMITS.PIECE_DESCRIPTION}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short notes about style, palette, or inspiration..."
              rows={2}
              className="textarea textarea-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary" />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="btn btn-ghost flex-1 rounded-full font-bold"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="btn btn-primary flex-1 rounded-full font-extrabold tracking-wide"
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Publish Piece"}
            </button>
          </div>
        </form>
    </ModalOverlay>
  )
}
