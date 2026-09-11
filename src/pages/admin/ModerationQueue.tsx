import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Check,
  CheckCircle,
  ChatCircle,
  Eye,
  TShirt,
  Trash,
  User,
  Sparkle,
  X,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  adminDeleteContent,
  fetchReports,
  updateReportStatus,
  type ContentReportRow,
  type ReportStatus,
  type ReportTargetType,
} from "../../lib/reports"

export function ModerationQueue({ adminId }: { adminId: string }) {
  const [reports, setReports] = useState<ContentReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("pending")
  const [targetFilter, setTargetFilter] = useState<ReportTargetType | "all">("all")
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReports({
        status: statusFilter,
        targetType: targetFilter,
      })
      setReports(data)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, targetFilter])

  useEffect(() => {
    void load()
  }, [load])

  const handleStatusChange = async (
    reportId: string,
    status: "resolved" | "dismissed",
    actionTaken = "none",
  ) => {
    setProcessingId(reportId)
    setError(null)
    try {
      await updateReportStatus({
        reportId,
        status,
        adminId,
        actionTaken,
      })
      await load()
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteContent = async (report: ContentReportRow) => {
    const ok = window.confirm(
      `Are you sure you want to delete this reported ${report.target_type}? This will permanently remove the content.`,
    )
    if (!ok) return

    setProcessingId(report.id)
    setError(null)
    try {
      await adminDeleteContent({
        targetType: report.target_type,
        targetId: report.target_id,
        subType: report.target_sub_type,
      })
      await updateReportStatus({
        reportId: report.id,
        status: "resolved",
        adminId,
        actionTaken: "content_deleted",
      })
      await load()
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setProcessingId(null)
    }
  }

  const getTargetIcon = (type: ReportTargetType) => {
    switch (type) {
      case "look":
        return Sparkle
      case "piece":
        return TShirt
      case "comment":
        return ChatCircle
      case "profile":
        return User
    }
  }

  const getTargetLink = (report: ContentReportRow) => {
    switch (report.target_type) {
      case "look":
        return `/look/${report.target_id}`
      case "piece":
        return `/piece/${report.target_id}`
      case "profile":
        return `/u/${report.target_label?.replace("Profile: @", "") || report.target_id}`
      case "comment":
        return null
    }
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-content/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "resolved", "dismissed", "all"] as const).map((status) => {
            const active = statusFilter === status
            return (
              <button
                key={status}
                type="button"
                className={`btn btn-sm rounded-full font-bold capitalize transition-colors active:scale-[0.96] transition-transform ${
                  active
                    ? "btn-primary shadow-sm"
                    : "btn-ghost text-base-content/70 hover:text-base-content"
                }`}
                onClick={() => setStatusFilter(status)}
              >
                <span>{status}</span>
                {status === "pending" && pendingCount > 0 ? (
                  <span className="badge badge-xs badge-error font-mono font-black ml-1 tabular-nums">
                    {pendingCount}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="target-filter" className="text-xs font-bold text-base-content/60">
            Type:
          </label>
          <select
            id="target-filter"
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as ReportTargetType | "all")}
            className="select select-sm select-bordered rounded-xl font-semibold focus:outline-none focus:border-primary"
          >
            <option value="all">All Content</option>
            <option value="look">Looks</option>
            <option value="piece">Pieces</option>
            <option value="comment">Comments</option>
            <option value="profile">Profiles</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="alert alert-error text-sm font-bold" role="alert">
          {error}
        </div>
      ) : null}

      {/* Reports List */}
      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading moderation queue">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-base-content/10 bg-base-200/40 p-4 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 rounded-full bg-base-content/10" />
                  <div className="h-5 w-20 rounded-full bg-base-content/10" />
                  <div className="h-4 w-28 rounded-full bg-base-content/10" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-20 rounded-full bg-base-content/10" />
                  <div className="h-7 w-20 rounded-full bg-base-content/10" />
                </div>
              </div>
              <div className="h-5 w-1/3 rounded-lg bg-base-content/10" />
              <div className="h-4 w-2/3 rounded-lg bg-base-content/10" />
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-base-content/20 bg-base-200/20 p-12 text-center space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <Icon icon={CheckCircle} size="lg" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-base-content text-balance">All caught up!</h3>
            <p className="text-xs text-base-content/60 text-pretty">
              No {statusFilter === "all" ? "" : statusFilter} reports in this category.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isProcessing = processingId === report.id
            const targetLink = getTargetLink(report)

            return (
              <div
                key={report.id}
                className="group relative rounded-2xl border border-base-content/10 bg-base-200/50 p-4 transition-colors hover:border-base-content/25 hover:bg-base-200/80 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-sm badge-ghost font-extrabold uppercase gap-1 tracking-wider text-xs">
                        <Icon icon={getTargetIcon(report.target_type)} size="xs" />
                        {report.target_type}
                      </span>
                      <span
                        className={`badge badge-sm font-bold capitalize text-xs ${
                          report.status === "pending"
                            ? "badge-warning"
                            : report.status === "resolved"
                              ? "badge-success text-success-content"
                              : "badge-ghost"
                        }`}
                      >
                        {report.status}
                      </span>
                      {report.action_taken && report.action_taken !== "none" ? (
                        <span className="badge badge-sm badge-outline badge-error text-xs font-bold">
                          {report.action_taken.replace("_", " ")}
                        </span>
                      ) : null}
                      <span className="text-xs font-medium text-base-content/50 tabular-nums">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black truncate text-base-content">
                        {report.target_label || `${report.target_type} ID: ${report.target_id}`}
                      </h4>
                      {targetLink ? (
                        <Link
                          to={targetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-xs min-h-[28px] px-2.5 rounded-full gap-1 text-primary active:scale-[0.96] transition-transform"
                          title="Inspect live content"
                        >
                          <Icon icon={Eye} size="xs" />
                          View
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex items-baseline gap-2 pt-0.5">
                      <span className="badge badge-error badge-outline badge-sm text-xs font-extrabold">
                        {report.reason}
                      </span>
                      {report.details ? (
                        <p className="text-xs text-base-content/80 line-clamp-2 italic">
                          "{report.details}"
                        </p>
                      ) : null}
                    </div>

                    <div className="text-xs text-base-content/40 font-mono pt-1 tabular-nums">
                      Reporter: {report.reporter_id}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {report.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void handleStatusChange(report.id, "resolved", "approved")}
                          className="btn btn-success btn-xs min-h-[30px] px-3 rounded-full font-bold gap-1 active:scale-[0.96] transition-transform shadow-sm"
                          title="Mark resolved"
                        >
                          <Icon icon={Check} size="xs" />
                          Resolve
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => void handleStatusChange(report.id, "dismissed", "dismissed")}
                          className="btn btn-ghost btn-xs min-h-[30px] px-3 rounded-full font-bold gap-1 text-base-content/70 hover:bg-base-300/60 active:scale-[0.96] transition-transform"
                          title="Dismiss report"
                        >
                          <Icon icon={X} size="xs" />
                          Dismiss
                        </button>
                        {report.target_type !== "profile" ? (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => void handleDeleteContent(report)}
                            className="btn btn-error btn-outline btn-xs min-h-[30px] px-3 rounded-full font-bold gap-1 active:scale-[0.96] transition-transform"
                            title="Delete offending content"
                          >
                            <Icon icon={Trash} size="xs" />
                            Delete Content
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-base-content/40">
                        {report.status === "resolved" ? "Resolved" : "Dismissed"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
