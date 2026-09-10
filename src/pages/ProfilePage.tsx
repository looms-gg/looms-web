import { useCallback, useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { formatErrorMessage } from "../lib/errorFormat"
import type { GarmentRow, LookRow, ProfileRow } from "../lib/supabase"
import { useAuthOptional } from "../state/auth"
import { parseProfileTab, type ProfileTab } from "./profileTab"
import {
  fetchLikedContent,
  fetchProfileByUsername,
  fetchPublicLooks,
  fetchPublicUploads,
  type LikedContent,
} from "./profile/profileApi"
import { ProfileHeader } from "./profile/ProfileHeader"
import { ProfileSkeleton } from "./profile/ProfileSkeleton"
import { ProfileTabs } from "./profile/ProfileTabs"

const emptyLiked: LikedContent = { garments: [], looks: [], order: [] }

export function ProfilePage() {
  const { username = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const auth = useAuthOptional()
  const urlTab = parseProfileTab(searchParams.toString())
  const [optimisticTab, setOptimisticTab] = useState<ProfileTab | null>(null)

  useEffect(() => {
    if (optimisticTab != null && optimisticTab === urlTab) {
      setOptimisticTab(null)
    }
  }, [optimisticTab, urlTab])

  const tab = optimisticTab ?? urlTab

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
      const viewerId = auth?.user?.id
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
  }, [auth?.user?.id, username])

  useEffect(() => {
    void load()
  }, [load])

  function setTab(next: ProfileTab) {
    setOptimisticTab(next)
    setSearchParams({ tab: next })
  }

  const isOwner = Boolean(auth?.user && profile && auth.user.id === profile.id)
  const canViewLikes = Boolean(profile && (isOwner || profile.show_likes))

  useEffect(() => {
    if (profile && tab === "liked" && !canViewLikes) {
      setOptimisticTab("uploads")
      setSearchParams({ tab: "uploads" })
    }
  }, [canViewLikes, profile, setSearchParams, tab])

  if (loading) {
    return <ProfileSkeleton />
  }

  if (notFound || !profile) {
    return (
      <div className="rounded-[18px] bg-base-200 px-6 py-12 text-center space-y-4">
        <h1 className="text-2xl font-extrabold">Profile not found</h1>
        <p className="text-base-content/70">
          Nobody here goes by @{username || "that name"}.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Explore
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} isOwner={isOwner} />
      {errorMsg ? (
        <p className="text-sm text-error" role="alert">
          {errorMsg}
        </p>
      ) : null}
      <ProfileTabs
        tab={tab}
        username={profile.username}
        uploads={uploads}
        looks={looks}
        liked={liked}
        canViewLikes={canViewLikes}
        isOwner={isOwner}
        onTab={setTab}
      />
    </div>
  )
}
