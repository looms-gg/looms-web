import type { ReactNode } from "react"
import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../../components/ui/FaIcon"
import { ModalOverlay } from "../../components/ui/ModalOverlay"

export function InspectorModal({
  open = true,
  title,
  onClose,
  children,
}: {
  open?: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      label={title}
      panelClassName="modal-panel relative w-full max-w-sm rounded-2xl border border-white/10 bg-base-300 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3 z-10 text-base-content/70 hover:text-base-content"
        aria-label="Close"
        onClick={onClose}
      >
        <FaIcon icon={faXmark} className="size-4" />
      </button>
      {children}
    </ModalOverlay>
  )
}
