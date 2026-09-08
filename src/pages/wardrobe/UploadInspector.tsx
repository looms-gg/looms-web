import { useState, useEffect, useRef, type KeyboardEvent, type ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  faCloudArrowUp,
  faPen,
  faShirt,
  faTrash,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../../components/FaIcon"
import { IsoThumb } from "../../components/IsoThumb"
import { SLOT_LABEL, type Piece } from "../../data/catalog"
import { validateDimensions } from "../../components/UploadPieceModal"
import { MAX_LIMITS, sanitizeText, validateFileSize } from "../../lib/sanitize"
import { formatErrorMessage } from "../../lib/errorFormat"
import { useSession } from "../../state/closet"
import { useCatalog } from "../../state/catalog"
import { useAuthOptional } from "../../state/auth"
import { supabase } from "../../lib/supabase"

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
  const { wear, notify } = useSession()
  const { upsert, reload } = useCatalog()
  const navigate = useNavigate()

  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(piece.name)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [draftDesc, setDraftDesc] = useState(piece.blurb ?? "")
  const [isPublic, setIsPublic] = useState(piece.isPublic ?? true)
  const [replacing, setReplacing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftName(piece.name)
    setIsEditingName(false)
    setDraftDesc(piece.blurb ?? "")
    setIsEditingDesc(false)
    setIsPublic(piece.isPublic ?? true)
    setConfirmDelete(false)
    setErrorMsg(null)
  }, [piece.id, piece.name, piece.blurb, piece.isPublic])

  async function handleNameSubmit() {
    const cleanName = sanitizeText(draftName, MAX_LIMITS.PIECE_NAME)
    const next = cleanName || piece.name
    setIsEditingName(false)
    if (next === piece.name) return

    setDraftName(next)
    try {
      const { error } = await supabase
        .from("garments")
        .update({ name: next })
        .eq("id", piece.id)

      if (error) throw error

      upsert({ ...piece, name: next })
      notify(`Renamed garment to "${next}".`)
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
      setDraftName(piece.name)
    }
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      void handleNameSubmit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setDraftName(piece.name)
      setIsEditingName(false)
    }
  }

  async function handleDescSubmit() {
    const next = sanitizeText(draftDesc, MAX_LIMITS.PIECE_DESCRIPTION, { multiline: true })
    setIsEditingDesc(false)
    if (next === (piece.blurb ?? "")) return

    setDraftDesc(next)
    try {
      const { error } = await supabase
        .from("garments")
        .update({ description: next || null })
        .eq("id", piece.id)

      if (error) throw error

      upsert({ ...piece, blurb: next })
      notify("Updated garment description.")
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
      setDraftDesc(piece.blurb ?? "")
    }
  }

  function handleDescKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleDescSubmit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setDraftDesc(piece.blurb ?? "")
      setIsEditingDesc(false)
    }
  }

  async function handleTogglePublic(nextPublic: boolean) {
    setIsPublic(nextPublic)
    try {
      const { error } = await supabase
        .from("garments")
        .update({ is_public: nextPublic })
        .eq("id", piece.id)

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
    if (!user) {
      setErrorMsg("Must be signed in to replace texture.")
      return
    }

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
        const storagePath = `${user.id}/${piece.id}.png`
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

    try {
      const { error } = await supabase.from("garments").delete().eq("id", piece.id)
      if (error) throw error

      notify(`Deleted "${piece.name}".`)
      await reload()
      onDeleted?.()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete garment.")
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
            <FaIcon icon={faTriangleExclamation} className="size-4 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                type="text"
                maxLength={MAX_LIMITS.PIECE_NAME}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => void handleNameSubmit()}
                onKeyDown={handleNameKeyDown}
                className="input input-bordered input-sm h-9 w-full font-extrabold text-lg"
                aria-label="Garment name"
                autoFocus
              />
            ) : (
              <>
                <h2 className="text-xl font-extrabold truncate" title={piece.name}>
                  {piece.name}
                </h2>
                <button
                  type="button"
                  aria-label="Edit garment name"
                  onClick={() => setIsEditingName(true)}
                  className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
                >
                  <FaIcon icon={faPen} className="size-3" />
                </button>
              </>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-base-content/60">
            Added {new Date(piece.added).toLocaleDateString()}
          </p>
        </div>

        <div>
          <div className="flex items-start gap-2">
            {isEditingDesc ? (
              <textarea
                value={draftDesc}
                maxLength={MAX_LIMITS.PIECE_DESCRIPTION}
                onChange={(e) => setDraftDesc(e.target.value)}
                onBlur={() => void handleDescSubmit()}
                onKeyDown={handleDescKeyDown}
                className="textarea textarea-bordered textarea-sm w-full text-xs"
                placeholder="Add a description"
                aria-label="Garment description"
                autoFocus
                rows={2}
              />
            ) : (
              <div className="group flex w-full items-start justify-between gap-2">
                <p
                  onClick={() => setIsEditingDesc(true)}
                  className={`text-xs cursor-pointer ${
                    piece.blurb ? "text-base-content/80" : "text-base-content/40 italic"
                  }`}
                >
                  {piece.blurb || "Add a description"}
                </p>
                <button
                  type="button"
                  aria-label="Edit garment description"
                  onClick={() => setIsEditingDesc(true)}
                  className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-base-content"
                >
                  <FaIcon icon={faPen} className="size-2.5" />
                </button>
              </div>
            )}
          </div>
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
            <FaIcon icon={faCloudArrowUp} className="size-3.5 mr-1.5" />
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
            <FaIcon icon={faShirt} className="size-3.5 mr-1.5" />
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
            <FaIcon icon={faTrash} className="size-3 mr-1" />
            {confirmDelete ? "Confirm delete upload?" : "Delete upload"}
          </button>
        </div>
      </div>
    </aside>
  )
}
