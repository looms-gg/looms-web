import { memo, useMemo } from "react"
import { equippedFromStack, piecesFromEquipped } from "../../data/outfit"
import { IsoThumb } from "../iso/IsoThumb"
import { LikeButton } from "../piece/LikeButton"
import { TileShell, LOOK_BADGE } from "../piece/TileShell"
import type { PublicLook } from "../../state/publicLooks"

export const LookTile = memo(function LookTile({
  look,
  onLikeCountChange,
}: {
  look: PublicLook
  onLikeCountChange?: (newCount: number) => void
}) {
  const outfit = useMemo(
    () => piecesFromEquipped(equippedFromStack(look.stack), look.stack),
    [look.stack],
  )
  const layerCount = look.stack.length

  return (
    <TileShell
      to={`/look/${look.id}`}
      title={look.name}
      maker={look.maker}
      badge={LOOK_BADGE}
      media={
        <IsoThumb
          outfit={outfit}
          bodyId={look.bodyId}
          bodyHue={look.bodyHue}
          model={look.model}
          alt={look.name}
        />
      }
      meta={
        <span className="text-xs font-extrabold text-base-content/60">
          <span className="tabular-nums font-bold text-primary">{layerCount}</span> layers
          <span className="opacity-40"> · </span>
          <span className="capitalize">{look.model}</span>
        </span>
      }
    >
      <LikeButton
        type="look"
        id={look.id}
        count={look.likeCount}
        onCountChange={onLikeCountChange}
        size="sm"
        className="shrink-0"
      />
    </TileShell>
  )
})
