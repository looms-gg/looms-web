import { faXmark } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../../components/ui/FaIcon"
import { ModalOverlay } from "../../components/ui/ModalOverlay"

export function ProfilePrivacyModal({
  open = true,
  showLastSeen,
  showLikes,
  busy,
  onClose,
  onToggleLastSeen,
  onToggleLikes,
}: {
  open?: boolean
  showLastSeen: boolean
  showLikes: boolean
  busy?: boolean
  onClose: () => void
  onToggleLastSeen: (next: boolean) => void
  onToggleLikes: (next: boolean) => void
}) {
  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      label="Privacy settings"
      scrimClassName="modal-scrim modal-scrim-soft"
      panelClassName="modal-panel relative w-full max-w-xs rounded-2xl border border-white/10 bg-base-300 p-5 shadow-2xl"
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2 text-base-content/70 hover:text-base-content"
        aria-label="Close"
        onClick={onClose}
      >
        <FaIcon icon={faXmark} className="size-4" />
      </button>

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
            onChange={(event) => onToggleLastSeen(event.target.checked)}
          />
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
            onChange={(event) => onToggleLikes(event.target.checked)}
          />
        </li>
      </ul>
    </ModalOverlay>
  )
}
