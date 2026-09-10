import { useState, useRef, type ChangeEvent, type FormEvent } from "react"
import {
  CloudArrowUp,
  Warning,
  X,
  CheckCircle,
} from "@phosphor-icons/react"
import { useAuthOptional } from "../../state/auth"
import { useCloset } from "../../state/closet"
import { useCatalog } from "../../state/catalog"
import { supabase, type GarmentRow } from "../../lib/supabase"
import { CLOTHING_SLOTS, SLOT_GROUP, type Group, type Slot } from "../../data/catalog"
import { garmentToPiece } from "../../data/garment"
import { MAX_LIMITS, sanitizeText, sanitizeUsername, validateFileSize } from "../../lib/sanitize"
import { formatErrorMessage } from "../../lib/errorFormat"
import { Icon } from "../ui/Icon"
import { ModalOverlay } from "../ui/ModalOverlay"

export interface UploadPieceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function validateDimensions(
  width: number,
  height: number,
): { valid: boolean; error?: string } {
  if (width !== 64 || height !== 64) {
    return {
      valid: false,
      error: "Texture must be 64x64 pixels (standard Minecraft skin format).",
    }
  }
  return { valid: true }
}

/** A set is a multi-region garment (bikini, tracksuit): one texture paints torso and legs. */
export function coversForSlot(slot: Slot): Group[] {
  return slot === "set" ? ["torso", "legs"] : [SLOT_GROUP[slot]]
}

export function UploadPieceModal({ isOpen, onClose }: UploadPieceModalProps) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const profile = auth?.profile ?? null
  const { addToWardrobe, notify } = useCloset()
  const { upsert } = useCatalog()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot>("shirt")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null)
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.type !== "image/png") {
      setErrorMsg("Only PNG files are supported for Minecraft garment textures.")
      return
    }

    const sizeCheck = validateFileSize(selectedFile, MAX_LIMITS.FILE_SIZE_BYTES)
    if (!sizeCheck.valid) {
      setErrorMsg(sizeCheck.error ?? "File size too large.")
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    const img = new Image()
    img.onload = () => {
      const { valid, error } = validateDimensions(img.width, img.height)
      if (!valid) {
        setErrorMsg(error ?? "Invalid dimensions.")
        URL.revokeObjectURL(objectUrl)
        return
      }

      setFile(selectedFile)
      setPreviewUrl(objectUrl)
      if (!name) {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        const cleanDefaultName = sanitizeText(
          baseName.charAt(0).toUpperCase() + baseName.slice(1),
          MAX_LIMITS.PIECE_NAME,
        )
        setName(cleanDefaultName)
      }
    }
    img.onerror = () => {
      setErrorMsg("Could not load texture file.")
      URL.revokeObjectURL(objectUrl)
    }
    img.src = objectUrl
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

    const sizeCheck = validateFileSize(file, MAX_LIMITS.FILE_SIZE_BYTES)
    if (!sizeCheck.valid) {
      setErrorMsg(sizeCheck.error ?? "File size too large.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const pieceName = sanitizeText(name, MAX_LIMITS.PIECE_NAME) || "Untitled Piece"
    const pieceDescription = sanitizeText(description, MAX_LIMITS.PIECE_DESCRIPTION, {
      multiline: true,
    })

    try {
      const pieceId = crypto.randomUUID()
      const storagePath = `${user.id}/${pieceId}.png`

      const { error: uploadError } = await supabase.storage
        .from("garments")
        .upload(storagePath, file, {
          contentType: "image/png",
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("garments").getPublicUrl(storagePath)

      const maker = profile?.username ? sanitizeUsername(profile.username) : "you"
      const group = SLOT_GROUP[slot]
      const covers = coversForSlot(slot)
      const row: GarmentRow = {
        id: pieceId,
        user_id: user.id,
        name: pieceName,
        description: pieceDescription || null,
        slot,
        body_group: group,
        saved_count: 0,
        like_count: 0,
        added: Date.now(),
        covers,
        texture_url: publicUrl,
        is_public: isPublic,
        tags: [],
        created_at: new Date().toISOString(),
      }

      const { error: dbError } = await supabase.from("garments").insert({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        description: row.description,
        slot: row.slot,
        body_group: row.body_group,
        saved_count: row.saved_count,
        like_count: row.like_count,
        added: row.added,
        covers: row.covers,
        texture_url: row.texture_url,
        is_public: row.is_public,
        tags: row.tags,
      })

      if (dbError) {
        throw new Error(`Failed to save garment record: ${dbError.message}`)
      }

      upsert(garmentToPiece(row, maker))
      addToWardrobe(pieceId)
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
      panelClassName="modal-panel relative w-full max-w-md rounded-2xl border border-white/10 bg-base-300 p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
    >
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 text-base-content/70 hover:text-base-content"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon icon={X} className="size-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/20 text-primary">
            <Icon icon={CloudArrowUp} className="size-5" />
          </span>
          <div>
            <h2
              id="upload-piece-title"
              className="text-xl font-black tracking-tight text-base-content"
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
            <Icon icon={Warning} className="shrink-0 size-4" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* File input / drag box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 hover:border-primary/50 rounded-2xl cursor-pointer bg-base-100/50 hover:bg-base-100 transition-colors text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Texture preview"
                  className="size-24 rounded-lg bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[size:16px_16px] object-contain p-1 border border-white/10 [image-rendering:pixelated]"
                />
                <span className="text-xs font-bold text-success flex items-center gap-1">
                  <Icon icon={CheckCircle} className="size-3" />
                  {file?.name} (64x64)
                </span>
                <span className="text-[11px] text-base-content/50">Click to change file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-base-content/65">
                <Icon icon={CloudArrowUp} className="size-8 text-primary/70 mb-1" />
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
              className="input input-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-base-content/80 mb-1">Slot</label>
              <select
                name="slot"
                value={slot}
                onChange={(e) => setSlot(e.target.value as Slot)}
                className="select select-bordered w-full rounded-xl bg-base-100 text-sm focus:border-primary capitalize"
              >
                {CLOTHING_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-base-content/80 mb-1">
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
            <label className="block text-xs font-bold text-base-content/80 mb-1">
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
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="btn btn-primary flex-1 rounded-full font-black tracking-wide"
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : "Publish Piece"}
            </button>
          </div>
        </form>
    </ModalOverlay>
  )
}
