import { Link, useParams } from "react-router-dom"
import { useAuthOptional } from "../state/auth"
import { ProfileHeader } from "./profile/ProfileHeader"
import { ProfileSkeleton } from "./profile/ProfileSkeleton"
import { ProfileTabs } from "./profile/ProfileTabs"
import { useProfileData } from "./profile/useProfileData"
import { useProfileTabState } from "./profile/useProfileTabState"

function ProfileNotFound({ username }: { username: string }) {
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

export function ProfilePage() {
  const { username = "" } = useParams()
  const auth = useAuthOptional()
  const viewerId = auth?.user?.id

  const {
    profile,
    uploads,
    looks,
    liked,
    loading,
    errorMsg,
    notFound,
  } = useProfileData(username, viewerId)

  const isOwner = Boolean(auth?.user && profile && auth.user.id === profile.id)
  const canViewLikes = Boolean(profile && (isOwner || profile.show_likes))

  const { tab, setTab } = useProfileTabState(canViewLikes)

  if (loading) {
    return <ProfileSkeleton />
  }

  if (notFound || !profile) {
    return <ProfileNotFound username={username} />
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
