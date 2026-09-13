import { useCallback, useEffect, useState } from "react"

const NOTICE_DISMISS_DELAY_MS = 2600

export function useWardrobeNotice() {
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeTick, setNoticeTick] = useState(0)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), NOTICE_DISMISS_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [notice, noticeTick])

  const flash = useCallback((message?: string) => {
    if (!message) return
    setNotice(message)
    setNoticeTick((tick) => tick + 1)
  }, [])

  const dismissNotice = useCallback(() => {
    setNotice(null)
  }, [])

  return { notice, flash, dismissNotice }
}

