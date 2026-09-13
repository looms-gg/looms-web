import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { parseProfileTab, type ProfileTab } from "./profileTab"

export function useProfileTabState(canViewLikes: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = parseProfileTab(searchParams.toString())
  const [optimisticTab, setOptimisticTab] = useState<ProfileTab | null>(null)

  useEffect(() => {
    if (optimisticTab != null && optimisticTab === urlTab) {
      setOptimisticTab(null)
    }
  }, [optimisticTab, urlTab])

  const tab = optimisticTab ?? urlTab

  useEffect(() => {
    if (tab === "liked" && !canViewLikes) {
      setOptimisticTab("uploads")
      setSearchParams({ tab: "uploads" })
    }
  }, [canViewLikes, setSearchParams, tab])

  function setTab(next: ProfileTab) {
    setOptimisticTab(next)
    setSearchParams({ tab: next })
  }

  return { tab, setTab }
}

