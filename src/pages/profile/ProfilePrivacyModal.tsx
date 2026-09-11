import { useState } from "react"
import { Warning } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { CloseButton } from "../../components/ui/CloseButton"
import { ModalOverlay } from "../../components/ui/ModalOverlay"
import { DangerZoneModal } from "./DangerZoneModal"

export function ProfilePrivacyModal({
  open = true,
  showLastSeen,
  showLikes,
  busy,
  onClose,
  onToggleLastSeen,
  onToggleLikes,
  onDeleteAccount,
}: {
  open?: boolean
  showLastSeen: boolean
  showLikes: boolean
  busy?: boolean
  onClose: () => void
  onToggleLastSeen: (next: boolean) => void
  onToggleLikes: (next: boolean) => void
  onDeleteAccount: () => void | Promise<void>
}) {
  const [dangerOpen, setDangerOpen] = useState(false)
  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      label="Privacy settings"
      scrimClassName="modal-scrim modal-scrim-soft"
      panelClassName="modal-panel relative w-full max-w-xs rounded-2xl border border-white/10 bg-base-300 p-5 shadow-2xl"
    >
      <CloseButton onClick={onClose} className="absolute right-0.5 top-0.5" />

      <h2 className="pr-8 text-lg font-extrabold">Privacy</h2>
      <p className="mt-1 text-sm text-base-content/65">
        Control what others see on your profile.
      </p>

      <ul className="mt-4 space-y-3">
        <li className="flex items-center justify-between gap-3 rounded-xl bg-base-200/80 px-3 py-3">
          <div className="min-w-0">
            <p className="font-bold text-sm">Last seen</p>
            <p className="text-xs text-base-content/60">Show when you were last active</p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={showLastSeen}
            disabled={busy}
            aria-label="Show last seen"
            onChange={(event) => onToggleLastSeen(event.target.checked)} />
        </li>
        <li className="flex items-center justify-between gap-3 rounded-xl bg-base-200/80 px-3 py-3">
          <div className="min-w-0">
            <p className="font-bold text-sm">Show likes</p>
            <p className="text-xs text-base-content/60">Let others browse your Liked tab</p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={showLikes}
            disabled={busy}
            aria-label="Show likes"
            onChange={(event) => onToggleLikes(event.target.checked)} />
        </li>
      </ul>

      <div className="mt-4 border-t border-base-content/10 pt-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/50">
          Danger zone
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-2 h-auto min-h-0 w-full justify-between rounded-xl px-3 py-2 text-error hover:bg-error/10"
          disabled={busy}
          onClick={() => setDangerOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Icon icon={Warning} size="sm" />
            Delete account
          </span>
          <span className="text-xs font-normal text-base-content/50">→</span>
        </button>
      </div>

      <DangerZoneModal
        open={dangerOpen}
        busy={busy ?? false}
        onClose={() => setDangerOpen(false)}
        onDone={async () => {
          setDangerOpen(false)
          onClose()
          await onDeleteAccount()
        }} />
    </ModalOverlay>
  )
}
