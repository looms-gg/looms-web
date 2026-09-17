import { useState } from "react"
import { StudioMobileNav, type MobileStage } from "./StudioMobileNav"
import { StudioStagePanel } from "./StudioStagePanel"
import { StudioCollection } from "./StudioCollection"
import { StudioAssembly } from "./StudioAssembly"
import type { useStudioBoard } from "./useStudioBoard"
import {
  assemblyProps,
  collectionProps,
  stageProps,
} from "./studioPanelProps"

type Board = ReturnType<typeof useStudioBoard>

export function StudioMobileShell({ board }: { board: Board }) {
  const [stage, setStage] = useState<MobileStage>("preview")

  return (
    <div className="studio-mobile-shell">
      <div className="studio-mobile-stage">
        <div className="studio-mobile-panel" key={stage}>
          {stage === "preview" && (
            <StudioStagePanel {...stageProps(board)} />
          )}
          {stage === "pieces" && (
            <StudioCollection {...collectionProps(board)} />
          )}
          {stage === "layers" && (
            <StudioAssembly {...assemblyProps(board)} />
          )}
        </div>
      </div>
      <StudioMobileNav
        stage={stage}
        onStage={setStage}
        saveAction={() => {
          setStage("preview")
          board.onSave()
        }}
      />
    </div>
  )
}
