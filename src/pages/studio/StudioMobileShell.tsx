import { useState } from "react"
import { StudioMobileNav, type MobileStage } from "./StudioMobileNav"
import { StudioStagePanel } from "./StudioStagePanel"
import { StudioRack } from "./StudioRack"
import { StudioLayers } from "./StudioLayers"
import type { useStudioBoard } from "./useStudioBoard"

type Board = ReturnType<typeof useStudioBoard>

export function StudioMobileShell({ board }: { board: Board }) {
  const [stage, setStage] = useState<MobileStage>("preview")

  return (
    <div className="studio-mobile-shell">
      <div className="studio-mobile-stage">
        <div className="studio-mobile-panel" key={stage}>
          {stage === "preview" && (
            <StudioStagePanel
              outfit={board.outfit}
              bodyId={board.bodyId}
              bodyHue={board.bodyHue}
              model={board.model}
              name={board.name}
              onName={board.setName}
              onSave={board.onSave}
              onDownload={board.downloadSkin}
              confirmOverwriteLook={board.confirmOverwriteLook}
              onConfirmOverwrite={board.onConfirmOverwrite}
              onSaveAsNew={board.onSaveAsNew}
              onCancelOverwrite={board.onCancelOverwrite}
            />
          )}
          {stage === "pieces" && (
            <StudioRack
              ownedCount={board.owned?.length ?? 0}
              ownedBySlot={board.ownedBySlot}
              racks={board.racks}
              rack={board.rack}
              equipped={board.equipped}
              onRack={board.setRack}
              onWear={(id) =>
                id.startsWith("eye-") ? board.wearEye(id) : board.wear(id)
              }
              onClear={board.clearSlot}
              bodies={board.bodies}
              body={board.body}
              bodyId={board.bodyId}
              bodyHue={board.bodyHue}
              bodyTint={board.bodyTint}
              hueOpen={board.hueOpen}
              equippedEyes={board.equipped.eyes}
              eyeOffset={board.eyeOffset}
              onPickTone={board.pickTone}
              onBodyHue={board.setBodyHue}
              onEyeOffset={board.setEyeOffset}
            />
          )}
          {stage === "layers" && (
            <StudioLayers
              body={board.body}
              bodyTint={board.bodyTint}
              bodyHue={board.bodyHue}
              model={board.model}
              stackTopFirst={board.stackTopFirst}
              onModel={board.setModel}
              onMove={board.moveStack}
              onClear={board.clearSlot}
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
