import { useState } from "react"
import { Warning } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { CloseButton } from "../../components/ui/CloseButton"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { requestAccountDeletion } from "../../lib/accountDeletion"
import { formatErrorMessage } from "../../lib/errorFormat"

export function DangerZoneModal({
  open,
  busy,
  onClose,
  onDone,
}: {
  open: boolean
  busy: boolean
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const [confirmText, setConfirmText] = useState("")
  const [working, setWorking] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const armed = confirmText.trim().toUpperCase() === "DELETE"
  const disabled = busy || working || !armed

  async function handleDelete() {
    if (disabled) return
    setWorking(true)
    setErrorMsg(null)
    const { error } = await requestAccountDeletion()
    setWorking(false)
    if (error) {
      setErrorMsg(formatErrorMessage(error))
      return
    }
    await onDone()
  }

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      label="Delete account"
      scrimClassName="modal-scrim modal-scrim-soft"
      panelClassName="modal-panel relative w-full max-w-xs rounded-2xl border border-white/10 bg-base-300 p-5 shadow-2xl"
    >
      <CloseButton onClick={onClose} className="absolute right-0.5 top-0.5" />

      <h2 className="pr-8 text-lg font-extrabold text-error">Delete account</h2>
      <p className="mt-1 text-sm text-base-content/65">
        This permanently removes your profile, uploads, looks, and comments. It cannot be undone.
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error">
        <Icon icon={Warning} size="sm" className="mt-0.5 shrink-0" />
        <span>Type DELETE below to confirm.</span>
      </div>

      <input
        type="text"
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        maxLength={10}
        aria-label="Type DELETE to confirm"
        className="input input-bordered mt-3 w-full rounded-xl bg-base-100 text-sm font-bold" />

      {errorMsg ? (
        <p className="mt-2 text-sm text-error" role="alert">
          {errorMsg}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm rounded-full font-bold" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm rounded-full font-extrabold"
          disabled={disabled}
          onClick={() => void handleDelete()}
        >
          {working ? <span className="loading loading-spinner loading-xs" /> : null}
          Delete forever
        </button>
      </div>
    </ModalOverlay>
  )
}
