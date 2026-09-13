import { useCallback, useEffect, useState } from "react"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  adminDeleteContent,
  fetchRecentPlatformActivity,
  type RecentActivityFeed,
} from "../../lib/reports"

export function useLatestActivity() {
  const [data, setData] = useState<RecentActivityFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchRecentPlatformActivity(25)
      setData(result)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = useCallback(
    async (
      targetType: "look" | "piece" | "comment",
      targetId: string,
      subType?: string,
    ) => {
      const ok = window.confirm(`Permanently delete this ${targetType}?`)
      if (!ok) return

      setDeletingId(targetId)
      setError(null)
      try {
        await adminDeleteContent({ targetType, targetId, subType })
        await load()
      } catch (err) {
        setError(formatErrorMessage(err))
      } finally {
        setDeletingId(null)
      }
    },
    [load],
  )

  return {
    data,
    loading,
    error,
    deletingId,
    load,
    handleDelete,
  }
}

