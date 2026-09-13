import { useEffect, useState } from "react"
import { DEFAULT_FEATURED_LOOKS, fetchLookById, type PublicLook } from "../../state/publicLooks"
import { formatErrorMessage } from "../../lib/errorFormat"

export function useLook(id: string | undefined) {
  const [look, setLook] = useState<PublicLook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    const defaultLook = DEFAULT_FEATURED_LOOKS.find((l) => l.id === id)
    if (defaultLook) {
      setLook(defaultLook)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    void fetchLookById(id)
      .then((res) => {
        if (active) {
          setLook(res)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(formatErrorMessage(err))
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [id])

  return { look, setLook, loading, error }
}

