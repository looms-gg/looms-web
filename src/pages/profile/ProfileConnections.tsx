import { useEffect, useState } from "react"
import { DiscordLogo } from "@phosphor-icons/react"
import { supabase } from "../../lib/supabase"
import { Icon } from "../../components/ui/Icon"

export function ProfileConnections({ userId }: { userId: string }) {
  const [featured, setFeatured] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from("profile_connections")
      .select("provider")
      .eq("user_id", userId)
      .eq("featured", true)
      .then(({ data }: { data: { provider: string }[] | null }) => {
        if (!cancelled && data) {
          setFeatured(data.some((row) => row.provider === "discord"))
        }
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (!featured) return null

  return (
    <span
      aria-label="On Discord"
      title="On Discord"
      className="inline-flex items-center rounded-full bg-base-100/80 px-2 py-0.5 text-base-content/70"
    >
      <Icon icon={DiscordLogo} size="sm" />
    </span>
  )
}
