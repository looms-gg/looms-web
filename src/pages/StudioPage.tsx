import { StudioCollection } from "./studio/StudioCollection"
import { StudioStagePanel } from "./studio/StudioStagePanel"
import { StudioAssembly } from "./studio/StudioAssembly"
import { useStudioBoard } from "./studio/useStudioBoard"
import { useIsMobile } from "../components/ui/useIsMobile"
import { StudioMobileShell } from "./studio/StudioMobileShell"
import {
  assemblyProps,
  collectionProps,
  stageProps,
} from "./studio/studioPanelProps"

export function StudioPage() {
  const board = useStudioBoard()
  const isMobile = useIsMobile()

  if (isMobile) {
    return <StudioMobileShell board={board} />
  }

  return (
    <div className="studio-board">
      <StudioCollection {...collectionProps(board)} />
      <StudioStagePanel {...stageProps(board)} />
      <StudioAssembly {...assemblyProps(board)} />
    </div>
  )
}
