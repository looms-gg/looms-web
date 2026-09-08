import { CommentsSection } from "../comments/CommentsSection"

export function PieceComments({
  garmentId,
  garmentOwnerId,
  isPublic = true,
}: {
  garmentId: string
  garmentOwnerId?: string
  isPublic?: boolean
}) {
  return (
    <CommentsSection
      targetType="garment"
      targetId={garmentId}
      ownerId={garmentOwnerId}
      isPublic={isPublic}
    />
  )
}
