import { useCallback, useEffect, useState } from "react"
import { formatErrorMessage } from "../../lib/errorFormat"
import type { GarmentRow, LookRow, ProfileRow } from "../../lib/supabase"
import {
  fetchLikedContent,
  fetchProfileByUsername,
  fetchPublicLooks,
  fetchPublicUploads,
  type LikedContent,
} from "./profileApi"

const emptyLiked: LikedContent = { garments: [], looks: [], order: [] }

export function useProfileData(username: string, viewerId: string | undefined) {
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [uploads, setUploads] = useState<GarmentRow[]>([])
  const [looks, setLooks] = useState<LookRow[]>([])
  const [liked, setLiked] = useState<LikedContent>(emptyLiked)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!username) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setNotFound(false)
    try {
      const next = await fetchProfileByUsername(username)
      if (!next) {
        setProfile(null)
        setNotFound(true)
        setUploads([])
        setLooks([])
        setLiked(emptyLiked)
        return
      }
      setProfile(next)
      const canFetchLikes = next.show_likes || next.id === viewerId
      const [nextUploads, nextLooks, nextLiked] = await Promise.all([
        fetchPublicUploads(next.id),
        fetchPublicLooks(next.id),
        canFetchLikes ? fetchLikedContent(next.id) : Promise.resolve(emptyLiked),
      ])
      setUploads(nextUploads)
      setLooks(nextLooks)
      setLiked(nextLiked)
    } catch (err) {
      setErrorMsg(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [username, viewerId])

  useEffect(() => {
    void load()
  }, [load])

  return {
    profile,
    uploads,
    looks,
    liked,
    loading,
    errorMsg,
    notFound,
  }
}

