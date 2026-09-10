import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  CloudArrowUp,
  TShirt,
  Trash,
  Warning,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { SLOT_LABEL, type Piece } from "../../data/catalog"
import { validateDimensions } from "../../components/piece/UploadPieceModal"
import { MAX_LIMITS, sanitizeText, validateFileSize } from "../../lib/sanitize"
import { formatErrorMessage } from "../../lib/errorFormat"
import { useCloset } from "../../state/closet"
import { useCatalog } from "../../state/catalog"
import { useAuthOptional } from "../../state/auth"
import { supabase } from "../../lib/supabase"
import { InlineEditableText } from "./InlineEditableText"

export function UploadInspector({
  piece,
  onDeleted,
  className = "",
}: {
  piece: Piece
  onDeleted?: () => void
  className?: string
}) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const { wear, notify } = useCloset()
  const { upsert, reload } = useCatalog()
  const navigate = useNavigate()

  const [isPublic, setIsPublic] = useState(piece.isPublic ?? true)
  const [replacing, setReplacing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsPublic(piece.isPublic ?? true)
    setConfirmDelete(false)
    setErrorMsg(null)
  }, [piece.id, piece.isPublic])

  function requireOwner(): string | null {
    if (!user) {
      setErrorMsg("Must be signed in to edit this piece.")
      return null
    }
    if (!piece.userId || piece.userId !== user.id) {
      setErrorMsg("You can only edit pieces you uploaded.")
      return null
    }
    return user.id
  }

  function commitName(draft: string): boolean {
    const ownerId = requireOwner()
    if (!ownerId) return false
    const cleanName = sanitizeText(draft, MAX_LIMITS.PIECE_NAME)
    const next = cleanName || piece.name
    if (next === piece.name) return true

    void (async () => {
      try {
        const { error } = await supabase
          .from("garments")
          .update({ name: next })
          .eq("id", piece.id)
          .eq("user_id", ownerId)

        if (error) throw error

        upsert({ ...piece, name: next })
        notify(`Renamed garment to "${next}".`)
      } catch (err) {
        setErrorMsg(formatErrorMessage(err))
      }
    })()

    return true
  }

  function commitDescription(draft: string): boolean {
    const ownerId = requireOwner()
    if (!ownerId) return false
    const next = sanitizeText(draft, MAX_LIMITS.PIECE_DESCRIPTION, { multiline: true })
    if (next === (piece.blurb ?? "")) return true

    void (async () => {
      try {
        const { error } = await supabase
          .from("garments")
          .update({ description: next || null })
          .eq("id", piece.id)
          .eq("user_id", ownerId)

        if (error) throw error

        upsert({ ...piece, blurb: next })
        notify("Updated garment description.")
      } catch (err) {
        setErrorMsg(formatErrorMessage(err))
      }
    })()

    return true
  }

  async function handleTogglePublic(nextPublic: boolean) {
    const ownerId = requireOwner()
    if (!ownerId) return
    setIsPublic(nextPublic)
    try {
      const { error } = await supabase
        .from("garments")
        .update({ is_public: nextPublic })
        .eq("id", piece.id)
        .eq("user_id", ownerId)

      if (error) throw error

      upsert({ ...piece, isPublic: nextPublic })
      notify(nextPublic ? "Piece is now public in Explore." : "Piece is now private.")
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
      setIsPublic(piece.isPublic ?? true)
    }
  }

  function handleTriggerFileInput() {
    setErrorMsg(null)
    fileInputRef.current?.click()
  }

  async function handleReplaceTexture(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ownerId = requireOwner()
    if (!ownerId) return

    if (file.type !== "image/png") {
      setErrorMsg("Only PNG files are supported for Minecraft garment textures.")
      return
    }

    const sizeCheck = validateFileSize(file, MAX_LIMITS.FILE_SIZE_BYTES)
    if (!sizeCheck.valid) {
      setErrorMsg(sizeCheck.error ?? "File size too large.")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = async () => {
      const { valid, error } = validateDimensions(img.width, img.height)
      URL.revokeObjectURL(objectUrl)
      if (!valid) {
        setErrorMsg(error ?? "Invalid texture dimensions.")
        return
      }

      setReplacing(true)
      setErrorMsg(null)
      try {
        const storagePath = `${ownerId}/${piece.id}.png`
        const { error: uploadError } = await supabase.storage
          .from("garments")
          .upload(storagePath, file, {
            contentType: "image/png",
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("garments").getPublicUrl(storagePath)

        const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`
        const now = Date.now()

        const { error: dbError } = await supabase
          .from("garments")
          .update({
            texture_url: cacheBustedUrl,
            added: now,
          })
          .eq("id", piece.id)
          .eq("user_id", ownerId)

        if (dbError) {
          throw new Error(`Database update failed: ${dbError.message}`)
        }

        upsert({
          ...piece,
          skin: cacheBustedUrl,
          added: now,
        })
        notify(`Uploaded new version for "${piece.name}"!`)
      } catch (err) {
        setErrorMsg(formatErrorMessage(err))
      } finally {
        setReplacing(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setErrorMsg("Could not load image file.")
    }
    img.src = objectUrl
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    const ownerId = requireOwner()
    if (!ownerId) return

    try {
      const { error } = await supabase
        .from("garments")
        .delete()
        .eq("id", piece.id)
        .eq("user_id", ownerId)
      if (error) throw error

      notify(`Deleted "${piece.name}".`)
      await reload()
      onDeleted?.()
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
      setConfirmDelete(false)
    }
  }

  return (
    <aside className={className}>
      <div className="overflow-hidden rounded-[14px] bg-base-300 relative group">
        <IsoThumb piece={piece} alt={piece.name} />
        <span className="absolute top-2 left-2 badge badge-neutral text-xs font-bold uppercase tracking-wider">
          {SLOT_LABEL[piece.slot]}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {errorMsg && (
          <div className="alert alert-error text-xs p-2.5 rounded-xl flex items-center gap-2">
            <Icon icon={Warning} className="size-4 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        <div>
          <InlineEditableText
            value={piece.name}
            maxLength={MAX_LIMITS.PIECE_NAME}
            onCommit={commitName}
            ariaLabel="Garment name"
            editAriaLabel="Edit garment name"
            title={piece.name}
          />
          <p className="mt-1 text-xs font-semibold text-base-content/60">
            Added {new Date(piece.added).toLocaleDateString()}
          </p>
        </div>

        <div>
          <InlineEditableText
            value={piece.blurb ?? ""}
            maxLength={MAX_LIMITS.PIECE_DESCRIPTION}
            multiline
            onCommit={commitDescription}
            ariaLabel="Garment description"
            editAriaLabel="Edit garment description"
            placeholder="Add a description"
          />
        </div>

        <div className="flex items-center justify-between border-t border-base-content/10 pt-3">
          <span className="text-xs font-bold text-base-content/70">
            {isPublic ? "Public in Explore" : "Private (only you)"}
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              role="switch"
              aria-label="Public garment"
              checked={isPublic}
              onChange={(e) => void handleTogglePublic(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleReplaceTexture}
            accept="image/png"
            className="hidden"
            aria-label="Upload new garment texture version"
          />
          <button
            type="button"
            className="btn btn-outline btn-sm rounded-full font-bold w-full"
            onClick={handleTriggerFileInput}
            disabled={replacing}
          >
            <Icon icon={CloudArrowUp} className="size-3.5 mr-1.5" />
            {replacing ? "Uploading version..." : "Upload new version"}
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm rounded-full font-extrabold w-full"
            onClick={() => {
              wear(piece.id)
              void navigate("/studio")
            }}
          >
            <Icon icon={TShirt} className="size-3.5 mr-1.5" />
            Wear in Studio
          </button>

          <button
            type="button"
            className={`btn btn-ghost btn-xs rounded-full font-bold w-full transition-colors ${
              confirmDelete
                ? "btn-error text-white font-extrabold"
                : "text-base-content/50 hover:text-error"
            }`}
            onClick={() => void handleDelete()}
          >
            <Icon icon={Trash} className="size-3 mr-1" />
            {confirmDelete ? "Confirm delete upload?" : "Delete upload"}
          </button>
        </div>
      </div>
    </aside>
  )
}
