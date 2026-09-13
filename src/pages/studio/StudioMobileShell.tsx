import { useState } from "react"
import { StudioMobileNav, type MobileStage } from "./StudioMobileNav"
import { StudioStagePanel } from "./StudioStagePanel"
import { StudioRack } from "./StudioRack"
import { StudioLayers } from "./StudioLayers"
import type { useStudioBoard } from "./useStudioBoard"
import {
  studioLayersProps,
  studioRackProps,
  studioStageProps,
} from "./studioPanelProps"

type Board = ReturnType<typeof useStudioBoard>

export function StudioMobileShell({ board }: { board: Board }) {
  const [stage, setStage] = useState<MobileStage>("preview")

  return (
    <div className="studio-mobile-shell">
      <div className="studio-mobile-stage">
        <div className="studio-mobile-panel" key={stage}>
          {stage === "preview" && (
            <StudioStagePanel {...studioStageProps(board)} />
          )}
          {stage === "pieces" && (
            <StudioRack {...studioRackProps(board)} />
          )}
          {stage === "layers" && (
            <StudioLayers
              {...studioLayersProps(board)}
              onOpenAppearance={() => {
                board.setRack("appearance")
                setStage("pieces")
              }}
            />
          )}
        </div>
      </div>
      <StudioMobileNav stage={stage} onStage={setStage} />
    </div>
  )
}
