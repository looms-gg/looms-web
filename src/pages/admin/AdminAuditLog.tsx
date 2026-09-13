import { useEffect, useState } from "react"
import { fetchAdminAuditLog } from "../../lib/adminAudit"
import type { AdminAuditLogRow } from "../../lib/supabase"
import { formatErrorMessage } from "../../lib/errorFormat"
import { Bone } from "../../components/ui/Bone"

function formatAction(action: string): string {
  return action.replaceAll("_", " ")
}

function AuditLogSkeleton() {
  return (
    <div
      className="space-y-2 rounded-[18px] bg-base-200 p-4"
      aria-busy="true"
      aria-label="Loading audit trail"
    >
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <Bone key={n} className="h-9" rounded="rounded-lg" />
      ))}
    </div>
  )
}

function AuditTableRow({ entry }: { entry: AdminAuditLogRow }) {
  return (
    <tr>
      <td className="whitespace-nowrap tabular-nums text-xs">
        {new Date(entry.created_at).toLocaleString()}
      </td>
      <td className="font-bold capitalize">{formatAction(entry.action)}</td>
      <td className="text-xs">
        {entry.target_table}
        {entry.target_id ? (
          <span className="ml-1 font-mono text-base-content/40">
            {entry.target_id.slice(0, 8)}
          </span>
        ) : null}
      </td>
      <td className="font-mono text-xs">{entry.admin_id.slice(0, 8)}</td>
    </tr>
  )
}

function useAdminAuditLog() {
  const [entries, setEntries] = useState<AdminAuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadLog() {
      setLoading(true)
      try {
        const rows = await fetchAdminAuditLog(100)
        if (!active) return
        setEntries(rows)
      } catch (err) {
        if (!active) return
        setErrorMsg(formatErrorMessage(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadLog()
    return () => {
      active = false
    }
  }, [])

  return { entries, loading, errorMsg }
}

export function AdminAuditLog() {
  const { entries, loading, errorMsg } = useAdminAuditLog()

  if (loading) {
    return <AuditLogSkeleton />
  }

  if (errorMsg) {
    return (
      <div className="rounded-[18px] bg-base-200 p-6 text-sm text-error" role="alert">
        {errorMsg}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-[18px] bg-base-200 p-6 text-sm text-base-content/60">
        No admin actions recorded yet. Moderation decisions and banner saves will appear here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[18px] bg-base-200 p-2">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>Target</th>
            <th>Admin</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <AuditTableRow key={entry.id} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
