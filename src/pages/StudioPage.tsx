import { StudioRack } from "./studio/StudioRack"
import { StudioStagePanel } from "./studio/StudioStagePanel"
import { StudioLayers } from "./studio/StudioLayers"
import { useStudioBoard } from "./studio/useStudioBoard"

export function StudioPage() {
  const board = useStudioBoard()
  return (
    <div className="studio-board">
      <StudioRack
        ownedCount={board.owned.length}
        ownedBySlot={board.ownedBySlot}
        racks={board.racks}
        rack={board.rack}
        equipped={board.equipped}
        onRack={board.setRack}
        onWear={(id) => (id.startsWith("eye-") ? board.wearEye(id) : board.wear(id))}
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
      <StudioLayers
        body={board.body}
        bodyTint={board.bodyTint}
        bodyHue={board.bodyHue}
        model={board.model}
        stackTopFirst={board.stackTopFirst}
        equippedEyes={board.equipped.eyes}
        onModel={board.setModel}
        onMove={board.moveLayer}
        onClear={board.clearSlot}
        onOpenAppearance={() => board.setRack("appearance")}
      />
    </div>
  )
}
