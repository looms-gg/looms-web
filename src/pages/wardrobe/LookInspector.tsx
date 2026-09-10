import { useState } from "react"
import { Download, Link, Check } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { IsoThumb } from "../../components/iso/IsoThumb"
import { piecesFromEquipped } from "../../data/outfit"
import { tryDownloadSkinFile } from "../../skin/compose"
import { useCloset, type Look } from "../../state/closet"
import { committedLookName } from "../../state/lookMeta"
import { MAX_LIMITS, sanitizeText } from "../../lib/sanitize"
import { copyShareLink, getLookShareUrl } from "../../lib/share"
import { InlineEditableText } from "./InlineEditableText"

export function LookInspector({
  look,
  onEditOutfit,
  className = "",
}: {
  look: Look
  onEditOutfit: () => void
  className?: string
}) {
  const { updateLookMeta, notify } = useCloset()
  const [copied, setCopied] = useState(false)

  const outfit = piecesFromEquipped(look.equipped, look.stack)
  const layerCount = outfit.length

  function commitName(draft: string) {
    const next = committedLookName(look.name, draft)
    if (next !== look.name) {
      updateLookMeta(look.id, { name: next })
    }
  }

  function commitDescription(draft: string) {
    const next = sanitizeText(draft, MAX_LIMITS.LOOK_DESCRIPTION, { multiline: true })
    if (next !== (look.description ?? "")) {
      updateLookMeta(look.id, { description: next })
    }
  }

  return (
    <aside className={className}>
      <div className="overflow-hidden rounded-[14px] bg-base-300">
        <IsoThumb
          outfit={outfit}
          bodyId={look.bodyId}
          bodyHue={look.bodyHue}
          model={look.model}
          alt={look.name}
        />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <InlineEditableText
            value={look.name}
            maxLength={MAX_LIMITS.LOOK_NAME}
            onCommit={commitName}
            ariaLabel="Look name"
            editAriaLabel="Edit name"
          />
          <p className="mt-1 text-xs font-semibold text-base-content/60">
            <span className="tabular-nums font-bold text-primary">{layerCount}</span> layers
            {look.savedAt ? ` · ${new Date(look.savedAt).toLocaleDateString()}` : ""}
          </p>
        </div>

        <div>
          <InlineEditableText
            value={look.description ?? ""}
            maxLength={MAX_LIMITS.LOOK_DESCRIPTION}
            multiline
            onCommit={commitDescription}
            ariaLabel="Look description"
            editAriaLabel="Edit description"
            placeholder="Add a description"
          />
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
              void (async () => {
                const ok = await tryDownloadSkinFile(
                  outfit,
                  look.bodyId,
                  look.bodyHue,
                  look.name.trim() || "looms-look",
                  look.model,
                )
                if (!ok) notify("Couldn't export that skin.")
              })()
            }}
          >
            <Icon icon={Download} className="size-3.5 mr-1.5" />
            Download skin
          </button>
          <button
            type="button"
            className={`btn ${copied ? "btn-success" : "btn-ghost"} rounded-full font-bold w-full border border-base-content/10`}
            onClick={() => {
              void (async () => {
                const url = getLookShareUrl(look.id)
                const ok = await copyShareLink(url)
                if (ok) {
                  setCopied(true)
                  notify("Outfit link copied to clipboard!")
                  setTimeout(() => setCopied(false), 2000)
                }
              })()
            }}
            title={copied ? "Link copied to clipboard!" : `Share ${look.name}`}
            aria-label={copied ? "Link copied" : `Share ${look.name}`}
          >
            <Icon icon={copied ? Check : Link} className="size-3.5 mr-1.5" />
            {copied ? "Copied!" : "Share outfit link"}
          </button>
        </div>
      </div>
    </aside>
  )
}
