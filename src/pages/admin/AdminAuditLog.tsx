import { useEffect, useState } from "react"
import { fetchAdminAuditLog } from "../../lib/adminAudit"
import type { AdminAuditLogRow } from "../../lib/supabase"
import { formatErrorMessage } from "../../lib/errorFormat"

function formatAction(action: string): string {
  return action.replaceAll("_", " ")
}

export function AdminAuditLog() {
  const [entries, setEntries] = useState<AdminAuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchAdminAuditLog(100)
      .then((rows) => {
        if (!active) return
        setEntries(rows)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setErrorMsg(formatErrorMessage(err))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="rounded-[18px] bg-base-200 p-6 text-sm font-bold text-base-content/60">
        Loading audit trail…
      </div>
    )
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
            <tr key={entry.id}>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
