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
      panelClassName="modal-panel inspector-panel relative w-full max-w-[56rem] overflow-hidden rounded-[18px] border border-white/10 bg-base-300 shadow-2xl"
    >
      <div className="absolute right-2.5 top-2.5 z-10">
        <CloseButton onClick={onClose} />
      </div>
      <div className="h-full p-6 sm:p-8">{children}</div>
    </ModalOverlay>
  )
}
