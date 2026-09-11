import { useState, type FormEvent } from "react"
import {
  CheckCircle,
  Flag,
  Warning,
} from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { CloseButton } from "../ui/CloseButton"
import { ModalOverlay } from "../ui/ModalOverlay"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS } from "../../lib/sanitize"
import {
  createContentReport,
  REPORT_REASONS,
  type ReportTargetType,
} from "../../lib/reports"

export type ReportModalProps = {
  open: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId: string
  targetSubType?: "garment_comment" | "look_comment" | null
  targetLabel?: string | null
  reporterId: string
}

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetSubType,
  targetLabel,
  reporterId,
}: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0].id)
  const [details, setDetails] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetForm = () => {
    setReason(REPORT_REASONS[0].id)
    setDetails("")
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
    setTimeout(resetForm, 200)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      await createContentReport({
        reporterId,
        targetType,
        targetId,
        targetSubType,
        targetLabel,
        reason,
        details: details.trim() || null,
      })
      setSuccess(true)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const formatTargetType = (type: ReportTargetType) => {
    switch (type) {
      case "look":
        return "Look"
      case "piece":
        return "Piece"
      case "comment":
        return "Comment"
      case "profile":
        return "Profile"
    }
  }

  return (
    <ModalOverlay
      open={open}
      onClose={handleClose}
      portal
      label={`Report ${formatTargetType(targetType)}`}
      scrimClassName="auth-scrim auth-scrim--inline"
      panelClassName="auth-scrim-panel relative w-full max-w-md rounded-[18px] border border-base-content/10 bg-base-200 p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-error/15 text-error">
            <Icon icon={Flag} size="md" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-base-content">
              Report {formatTargetType(targetType)}
            </h2>
            {targetLabel ? (
              <p className="mt-0.5 max-w-[300px] truncate text-xs font-semibold text-base-content/60">
                {targetLabel}
              </p>
            ) : null}
          </div>
        </div>
        <CloseButton
          onClick={handleClose}
          className="-mr-1 -mt-1 text-base-content/55"
          label="Close report modal" />
      </div>

      {success ? (
        <div className="py-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-success/15 text-success">
            <Icon icon={CheckCircle} size="lg" />
          </span>
          <h3 className="mt-4 text-2xl font-black tracking-tight">Report Submitted</h3>
          <p className="mx-auto mt-2 max-w-[300px] text-sm leading-relaxed text-base-content/65">
            Thank you for helping keep looms safe and creative. Our team will review this
            promptly.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-6 min-h-11 w-full rounded-full font-extrabold"
            onClick={handleClose}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <span className="block text-xs font-bold text-base-content/70">
              Reason for report
            </span>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => {
                const selected = reason === r.id
                return (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-2.5 transition-colors ${
                      selected
                        ? "border-error/40 bg-error/5 text-base-content"
                        : "border-base-content/10 hover:bg-base-content/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={selected}
                      onChange={() => setReason(r.id)}
                      className="radio radio-error radio-sm mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold leading-none">{r.label}</div>
                      <div className="text-[11px] leading-tight text-base-content/60">
                        {r.description}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="report-details"
                className="text-xs font-bold text-base-content/70"
              >
                Additional details
                <span className="ml-1 font-semibold text-base-content/45">optional</span>
              </label>
              <span className="text-[11px] font-medium tabular-nums text-base-content/40">
                {details.length} / {MAX_LIMITS.REPORT_DETAILS}
              </span>
            </div>
            <textarea
              id="report-details"
              className="textarea w-full rounded-[10px] border-base-content/10 bg-base-100 text-sm leading-relaxed"
              rows={3}
              placeholder="Provide context or timestamp to help our moderation team..."
              maxLength={MAX_LIMITS.REPORT_DETAILS}
              value={details}
              onChange={(e) => setDetails(e.target.value)} />
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 text-sm font-semibold text-error"
            >
              <Icon icon={Warning} size="sm" className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm rounded-full font-bold text-base-content/70 hover:text-base-content"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-error btn-sm min-h-11 rounded-full px-6 font-extrabold"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Submit Report"
              )}
            </button>
          </div>
        </form>
      )}
    </ModalOverlay>
  )
}
