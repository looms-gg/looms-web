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
      panelClassName="modal-panel inspector-panel relative w-full max-w-[56rem] overflow-hidden rounded-[18px] border border-base-content/10 bg-base-300 shadow-2xl"
    >
      <CloseButton onClick={onClose} className="absolute right-3 top-3 z-10" />
      <div className="h-full p-6 sm:p-8">{children}</div>
    </ModalOverlay>
  )
}
