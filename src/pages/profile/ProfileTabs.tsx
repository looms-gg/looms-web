import { PieceTile } from "../../components/PieceTile"
import { IsoThumb } from "../../components/IsoThumb"
import { RackGrid } from "../../components/RackGrid"
import { garmentToPiece } from "../../data/garment"
import { equippedFromStack, piecesFromEquipped } from "../../data/outfit"
import type { GarmentRow, LookRow } from "../../lib/supabase"
import { useLikesOptional } from "../../state/likes"
import type { ProfileTab } from "../profileTab"
import type { LikedContent } from "./profileApi"

export function ProfileTabs({
  tab,
  username,
  uploads,
  looks,
  liked,
  canViewLikes,
  isOwner = false,
  onTab,
}: {
  tab: ProfileTab
  username: string
  uploads: GarmentRow[]
  looks: LookRow[]
  liked: LikedContent
  canViewLikes: boolean
  isOwner?: boolean
  onTab: (tab: ProfileTab) => void
}) {
  const likes = useLikesOptional()
  const likedOrder =
    isOwner && likes
      ? liked.order.filter((ref) => likes.isLiked(ref.target_type, ref.target_id))
      : liked.order

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "uploads", label: "Uploads" },
    { id: "looks", label: "Looks" },
    ...(canViewLikes ? [{ id: "liked" as const, label: "Liked" }] : []),
  ]

  return (
    <section className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Profile content"
      >
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`btn btn-sm rounded-full font-extrabold ${
                active ? "btn-primary" : "btn-ghost"
              }`}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {tab === "uploads" ? (
        uploads.length === 0 ? (
          <Empty copy="No public pieces yet." />
        ) : (
          <RackGrid>
            {uploads.map((row) => (
              <PieceTile key={row.id} piece={garmentToPiece(row, username)} />
            ))}
          </RackGrid>
        )
      ) : null}

      {tab === "looks" ? (
        looks.length === 0 ? (
          <Empty copy="No public looks yet." />
        ) : (
          <RackGrid>
            {looks.map((look) => (
              <LookCard key={look.id} look={look} />
            ))}
          </RackGrid>
        )
      ) : null}

      {tab === "liked" && canViewLikes ? (
        likedOrder.length === 0 ? (
          <Empty copy="No likes yet." />
        ) : (
          <RackGrid>
            {likedOrder.map((ref) => {
              if (ref.target_type === "garment") {
                const row = liked.garments.find((g) => g.id === ref.target_id)
                if (!row) return null
                return (
                  <PieceTile
                    key={`g-${row.id}`}
                    piece={garmentToPiece(row, username)}
                  />
                )
              }
              const look = liked.looks.find((l) => l.id === ref.target_id)
              if (!look) return null
              return <LookCard key={`l-${look.id}`} look={look} />
            })}
          </RackGrid>
        )
      ) : null}
    </section>
  )
}

function Empty({ copy }: { copy: string }) {
  return (
    <div className="rounded-[18px] bg-base-200 px-6 py-10 text-center text-base-content/70">
      {copy}
    </div>
  )
}

function LookCard({ look }: { look: LookRow }) {
  const equipped = equippedFromStack(look.stack ?? [])
  const outfit = piecesFromEquipped(equipped, look.stack)

  return (
    <div className="piece-tile overflow-hidden rounded-[18px] bg-neutral">
      <IsoThumb
        outfit={outfit}
        bodyId={look.body_id}
        bodyHue={look.body_hue}
        model={look.model ?? "classic"}
        alt={look.name}
      />
      <div className="relative z-10 min-w-0 bg-neutral px-4 pb-4 pt-3">
        <h3
          className="block min-w-0 max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis font-extrabold"
          title={look.name}
        >
          {look.name}
        </h3>
        <p className="mt-2 text-sm text-base-content/60">Public look</p>
      </div>
    </div>
  )
}
