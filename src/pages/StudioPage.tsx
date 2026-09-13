import { useEffect, useState } from "react"
import { StudioRack } from "./studio/StudioRack"
import { StudioStagePanel } from "./studio/StudioStagePanel"
import { StudioLayers } from "./studio/StudioLayers"
import { useStudioBoard } from "./studio/useStudioBoard"
import { StudioMobileShell } from "./studio/StudioMobileShell"
import {
  studioLayersProps,
  studioRackProps,
  studioStageProps,
} from "./studio/studioPanelProps"

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false
  )
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return mobile
}

export function StudioPage() {
  const board = useStudioBoard()
  const isMobile = useIsMobile()

  if (isMobile) {
    return <StudioMobileShell board={board} />
  }

  return (
    <div className="studio-board">
      <StudioRack {...studioRackProps(board)} />
      <StudioStagePanel {...studioStageProps(board)} />
      <StudioLayers {...studioLayersProps(board)} />
    </div>
  )
}
