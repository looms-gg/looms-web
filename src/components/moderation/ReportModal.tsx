import { useState, type FormEvent } from "react"
import { faCheckCircle, faFlag, faXmark } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "../ui/FaIcon"
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
      panelClassName="w-full max-w-md rounded-2xl bg-base-100 p-6 shadow-2xl border border-base-content/10"
    >
      <div className="flex items-center justify-between border-b border-base-content/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-error/15 text-error">
            <FaIcon icon={faFlag} className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight">
              Report {formatTargetType(targetType)}
            </h2>
            {targetLabel ? (
              <p className="max-w-[280px] truncate text-xs font-semibold text-base-content/60">
                {targetLabel}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="btn btn-ghost btn-circle btn-sm"
          aria-label="Close report modal"
        >
          <FaIcon icon={faXmark} className="size-4" />
        </button>
      </div>

      {success ? (
        <div className="py-8 text-center space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/20 text-success">
            <FaIcon icon={faCheckCircle} className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold">Report Submitted</h3>
            <p className="text-xs text-base-content/70">
              Thank you for helping keep looms safe and creative. Our team will review this promptly.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-full px-6 font-extrabold"
            onClick={handleClose}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-base-content/60">
              Reason for report
            </label>
            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => {
                const selected = reason === r.id
                return (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-colors ${
                      selected
                        ? "border-error/40 bg-error/5 text-base-content"
                        : "border-base-content/10 hover:bg-base-200/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.id}
                      checked={selected}
                      onChange={() => setReason(r.id)}
                      className="radio radio-error radio-sm mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold leading-none">{r.label}</div>
                      <div className="text-[11px] text-base-content/60 leading-tight">
                        {r.description}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-base-content/60">
              <label htmlFor="report-details">Additional details (optional)</label>
              <span className="text-[11px] font-medium tabular-nums text-base-content/40">
                {details.length} / {MAX_LIMITS.REPORT_DETAILS}
              </span>
            </div>
            <textarea
              id="report-details"
              className="textarea textarea-bordered w-full text-sm leading-relaxed"
              rows={3}
              placeholder="Provide context or timestamp to help our moderation team..."
              maxLength={MAX_LIMITS.REPORT_DETAILS}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {error ? (
            <div className="alert alert-error text-xs font-bold py-2" role="alert">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm rounded-full font-bold"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-error btn-sm rounded-full font-extrabold px-5"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      )}
    </ModalOverlay>
  )
}
