import { useEffect, useState, type KeyboardEvent } from "react"
import { Pencil } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"

export function InlineEditableText({
  value,
  maxLength,
  onCommit,
  multiline = false,
  disabled = false,
  ariaLabel,
  editAriaLabel,
  title,
  placeholder = "Add a description",
}: {
  value: string
  maxLength: number
  onCommit: (draft: string) => void | boolean | Promise<void | boolean>
  multiline?: boolean
  disabled?: boolean
  ariaLabel: string
  editAriaLabel: string
  title?: string
  placeholder?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
    setIsEditing(false)
  }, [value])

  function startEditing() {
    if (disabled) return
    setDraft(value)
    setIsEditing(true)
  }

  function submit() {
    const result = onCommit(draft)
    if (result != null && typeof result === "object" && "then" in result) {
      void Promise.resolve(result).then((resolved) => {
        if (resolved !== false) setIsEditing(false)
      })
      return
    }
    if (result !== false) setIsEditing(false)
  }

  function cancel() {
    setDraft(value)
    setIsEditing(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault()
      cancel()
      return
    }
    if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
      e.preventDefault()
      void submit()
    }
  }

  if (isEditing) {
    if (multiline) {
      return (
        <div className="flex items-start gap-2">
          <textarea
            value={draft}
            maxLength={maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void submit()}
            onKeyDown={handleKeyDown}
            className="textarea textarea-bordered textarea-sm w-full text-xs"
            placeholder={placeholder}
            aria-label={ariaLabel}
            autoFocus
            rows={2}
          />
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          maxLength={maxLength}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void submit()}
          onKeyDown={handleKeyDown}
          className="input input-bordered input-sm h-9 w-full font-extrabold text-lg"
          aria-label={ariaLabel}
          autoFocus
        />
      </div>
    )
  }

  if (multiline) {
    return (
      <div className="flex items-start gap-2">
        <div className="group flex w-full items-start justify-between gap-2">
          <p
            onClick={disabled ? undefined : startEditing}
            title={title}
            className={`text-xs ${disabled ? "" : "cursor-pointer"} ${
              value ? "text-base-content/80" : "text-base-content/40 italic"
            }`}
          >
            {value || placeholder}
          </p>
          <button
            type="button"
            aria-label={editAriaLabel}
            title={editAriaLabel}
            disabled={disabled}
            onClick={startEditing}
            className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-base-content"
          >
            <Icon icon={Pencil} className="size-2.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xl font-extrabold truncate" title={title}>
        {value}
      </h2>
      <button
        type="button"
        aria-label={editAriaLabel}
        title={editAriaLabel}
        disabled={disabled}
        onClick={startEditing}
        className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content"
      >
        <Icon icon={Pencil} className="size-3" />
      </button>
    </div>
  )
}
