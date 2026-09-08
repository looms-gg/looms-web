import { useState, useEffect, type KeyboardEvent } from "react"
import { faDownload, faPen } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../../components/FaIcon"
import { IsoThumb } from "../../components/IsoThumb"
import { SLOTS } from "../../data/catalog"
import { piecesFromEquipped } from "../../data/outfit"
import { tryDownloadSkinFile } from "../../skin/compose"
import { useSession, type Look } from "../../state/closet"
import { committedLookName } from "../../state/lookMeta"
import { MAX_LIMITS, sanitizeText } from "../../lib/sanitize"

export function LookInspector({
  look,
  onEditOutfit,
  className = "",
}: {
  look: Look
  onEditOutfit: () => void
  className?: string
}) {
  const { updateLookMeta } = useSession()
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(look.name)
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [draftDesc, setDraftDesc] = useState(look.description ?? "")

  useEffect(() => {
    setDraftName(look.name)
    setIsEditingName(false)
    setDraftDesc(look.description ?? "")
    setIsEditingDesc(false)
  }, [look.id, look.name, look.description])

  const outfit = piecesFromEquipped(look.equipped, look.stack)
  const layerCount = SLOTS.filter((slot) => look.equipped[slot]).length

  function handleNameSubmit() {
    const next = committedLookName(look.name, draftName)
    if (next !== look.name) {
      updateLookMeta(look.id, { name: next })
    }
    setDraftName(next)
    setIsEditingName(false)
  }

  function handleNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleNameSubmit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setDraftName(look.name)
      setIsEditingName(false)
    }
  }

  function handleDescSubmit() {
    const next = sanitizeText(draftDesc, MAX_LIMITS.LOOK_DESCRIPTION, { multiline: true })
    if (next !== (look.description ?? "")) {
      updateLookMeta(look.id, { description: next })
    }
    setDraftDesc(next)
    setIsEditingDesc(false)
  }

  function handleDescKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleDescSubmit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setDraftDesc(look.description ?? "")
      setIsEditingDesc(false)
    }
  }

  return (
    <aside className={className}>
      <div className="overflow-hidden rounded-[14px] bg-base-300">
        <IsoThumb
          outfit={outfit}
          bodyId={look.bodyId}
          bodyHue={look.bodyHue}
          model={look.model ?? "classic"}
          alt={look.name}
        />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                type="text"
                maxLength={MAX_LIMITS.LOOK_NAME}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                className="input input-bordered input-sm h-9 w-full font-extrabold text-lg"
                aria-label="Look name"
                autoFocus
              />
            ) : (
              <>
                <h2 className="text-xl font-extrabold truncate">{look.name}</h2>
                <button
                  type="button"
                  aria-label="Edit name"
                  onClick={() => setIsEditingName(true)}
                  className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
                >
                  <FaIcon icon={faPen} className="size-3" />
                </button>
              </>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-base-content/60">
            <span className="tabular-nums font-bold text-primary">{layerCount}</span> layers
            {look.savedAt ? ` · ${new Date(look.savedAt).toLocaleDateString()}` : ""}
          </p>
        </div>

        <div>
          <div className="flex items-start gap-2">
            {isEditingDesc ? (
              <textarea
                value={draftDesc}
                maxLength={MAX_LIMITS.LOOK_DESCRIPTION}
                onChange={(e) => setDraftDesc(e.target.value)}
                onBlur={handleDescSubmit}
                onKeyDown={handleDescKeyDown}
                className="textarea textarea-bordered textarea-sm w-full text-xs"
                placeholder="Add a description"
                aria-label="Look description"
                autoFocus
                rows={2}
              />
            ) : (
              <div className="group flex w-full items-start justify-between gap-2">
                <p
                  onClick={() => setIsEditingDesc(true)}
                  className={`text-xs cursor-pointer ${
                    look.description ? "text-base-content/80" : "text-base-content/40 italic"
                  }`}
                >
                  {look.description || "Add a description"}
                </p>
                <button
                  type="button"
                  aria-label="Edit description"
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
            {look.visibility === "public" ? "Public" : "Private"}
          </span>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              role="switch"
              aria-label="Public look"
              checked={look.visibility === "public"}
              onChange={(e) =>
                updateLookMeta(look.id, {
                  visibility: e.target.checked ? "public" : "private",
                })
              }
              className="toggle toggle-primary toggle-sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            className="btn btn-primary rounded-full font-extrabold w-full"
            onClick={onEditOutfit}
          >
            Edit outfit
          </button>
          <button
            type="button"
            className="btn btn-ghost rounded-full font-bold w-full"
            onClick={() => {
              void tryDownloadSkinFile(
                outfit,
                look.bodyId,
                look.bodyHue,
                look.name.trim() || "looms-look",
                look.model ?? "classic",
              )
            }}
          >
            <FaIcon icon={faDownload} className="size-3.5 mr-1.5" />
            Download skin
          </button>
        </div>
      </div>
    </aside>
  )
}
