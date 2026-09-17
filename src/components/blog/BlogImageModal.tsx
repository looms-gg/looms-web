import { useState } from "react"
import { X } from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { isSupportedBlogImageHost, normalizeBlogImageUrl } from "../../data/blog"
import { sanitizeUrl } from "../../lib/sanitize"

type BlogImageModalProps = {
  open: boolean
  onClose: () => void
  onInsert: (markdown: string) => void
}

export function BlogImageModal({ open, onClose, onInsert }: BlogImageModalProps) {
  const [insertImageUrl, setInsertImageUrl] = useState("")
  const [insertImageAlt, setInsertImageAlt] = useState("")

  function handleInsertImage() {
    const rawUrl = insertImageUrl.trim()
    const normalized = normalizeBlogImageUrl(rawUrl) || rawUrl
    const cleanUrl = sanitizeUrl(normalized)
    if (!cleanUrl) return
    const alt = insertImageAlt.trim() || "Image description"

    onInsert(`\n![${alt}](${cleanUrl})\n`)
    setInsertImageUrl("")
    setInsertImageAlt("")
  }

  if (!open) return null

  return (
    <div className="modal modal-open z-[70]">
      <div className="modal-box max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold">Insert Image</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
            <Icon icon={X} size="xs" />
          </button>
        </div>
        <p className="text-xs text-base-content/60">
          Host your image on Imgur (i.imgur.com) or Filegarden (filegarden.com), then paste the link.
        </p>
        <div className="space-y-3 text-xs">
          <div>
            <label htmlFor="insert-image-url" className="mb-1 block font-bold">
              Image URL
            </label>
            <input
              id="insert-image-url"
              type="url"
              placeholder="https://i.imgur.com/example.png"
              value={insertImageUrl}
              onChange={(e) => setInsertImageUrl(e.target.value)}
              className="input input-bordered w-full text-xs"
              required
            />
            {insertImageUrl.trim() && !isSupportedBlogImageHost(insertImageUrl) ? (
              <p className="mt-1 text-[11px] font-semibold text-warning">
                For best compatibility, use a link from Imgur or Filegarden.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="insert-image-alt" className="mb-1 block font-bold">
              Caption / alt text (optional)
            </label>
            <input
              id="insert-image-alt"
              type="text"
              placeholder="New armor set showcase"
              value={insertImageAlt}
              onChange={(e) => setInsertImageAlt(e.target.value)}
              className="input input-bordered w-full text-xs"
            />
          </div>

          {insertImageUrl.trim() ? (
            <div className="rounded-xl bg-base-200/60 p-2 text-center">
              <span className="mb-1 block text-[10px] font-bold text-base-content/50">Preview</span>
              <img
                src={insertImageUrl}
                alt="Preview"
                className="mx-auto max-h-32 rounded-lg object-contain"
                onError={(e) => {
                  ;(e.currentTarget as HTMLElement).style.display = "none"
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsertImage}
            disabled={!insertImageUrl.trim()}
            className="btn btn-primary btn-sm font-bold"
          >
            Insert into Post
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  )
}
