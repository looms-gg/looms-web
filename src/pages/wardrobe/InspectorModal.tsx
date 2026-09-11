import type { ReactNode } from "react"
import { CloseButton } from "../../components/ui/CloseButton"
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
      <CloseButton onClick={onClose} className="absolute right-1.5 top-1.5 z-10" />
      {children}
    </ModalOverlay>
  )
}
