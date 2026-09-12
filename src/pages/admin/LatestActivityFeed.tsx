import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  ChatCircle,
  Eye,
  ArrowsClockwise,
  TShirt,
  Trash,
  User,
  Stack,
} from "@phosphor-icons/react"
import { Icon, type IconType } from "../../components/ui/Icon"
import { EmptyState } from "../../components/ui/EmptyState"
import { Bone } from "../../components/ui/Bone"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  adminDeleteContent,
  fetchRecentPlatformActivity,
  type RecentActivityFeed,
} from "../../lib/reports"

type ActivityFilter = "all" | "looks" | "pieces" | "comments" | "profiles"

function LedgerSection({
  icon,
  iconColor,
  label,
  count,
  children,
}: {
  icon: IconType
  iconColor: string
  label: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-base-content/70">
        <Icon icon={icon} size="xs" className={iconColor} />
        {label} ({count})
      </h3>
      <div className="flex flex-col divide-y divide-base-content/10 overflow-hidden rounded-[18px] border border-base-content/10 bg-base-200/40">
        {children}
      </div>
    </section>
  )
}

function LedgerRow({ align = "center", children }: { align?: "center" | "start"; children: ReactNode }) {
  return (
    <div
      className={`flex ${
        align === "start" ? "items-start" : "items-center"
      } justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-base-200/70`}
    >
      {children}
    </div>
  )
}

function IconAction({
  to,
  onClick,
  title,
  tone,
  disabled,
  children,
}: {
  to?: string
  onClick?: () => void
  title: string
  tone: "primary" | "error"
  disabled?: boolean
  children: ReactNode
}) {
  const toneClass =
    tone === "primary" ? "text-primary hover:bg-primary/15" : "text-error hover:bg-error/20"
  const className = `btn btn-ghost btn-xs size-8 ${toneClass} active:scale-[0.96] transition-transform`
  if (to) {
    return (
      <Link to={to} target="_blank" rel="noreferrer" className={className} title={title}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className} title={title}>
      {children}
    </button>
  )
}

export function LatestActivityFeed() {
  const [data, setData] = useState<RecentActivityFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ActivityFilter>("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchRecentPlatformActivity(25)
      setData(result)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (
    targetType: "look" | "piece" | "comment",
    targetId: string,
    subType?: string,
  ) => {
    const ok = window.confirm(`Permanently delete this ${targetType}?`)
    if (!ok) return

    setDeletingId(targetId)
    setError(null)
    try {
      await adminDeleteContent({ targetType, targetId, subType })
      await load()
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-content/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "looks", "pieces", "comments", "profiles"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`btn btn-sm btn-pill font-bold capitalize transition-colors active:scale-[0.96] transition-transform ${
                filter === f ? "btn-primary shadow-sm" : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="btn btn-ghost btn-sm font-bold gap-1.5 text-base-content/70 hover:text-base-content transition-colors active:scale-[0.96] transition-transform"
          title="Refresh activity"
        >
          <Icon icon={ArrowsClockwise} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="alert alert-error text-sm font-bold" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading recent activity">
          <div className="space-y-2">
            <Bone className="h-4 w-32" rounded="rounded-md" />
            <div className="flex flex-col divide-y divide-base-content/10 overflow-hidden rounded-[18px] border border-base-content/10 bg-base-200/40">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Bone className="h-4 w-2/5" rounded="rounded-md" delay={n} />
                    <Bone className="h-3 w-3/5" rounded="rounded-md" delay={n} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !data ||
        (data.looks.length === 0 &&
          data.pieces.length === 0 &&
          data.comments.length === 0 &&
          data.profiles.length === 0) ? (
        <EmptyState
          title="Nothing to review yet"
          body="New community looks, pieces, and comments will show up here."
        />
      ) : (
        <div className="space-y-8">
          {(filter === "all" || filter === "looks") && data.looks.length > 0 ? (
            <LedgerSection icon={Stack} iconColor="text-primary" label="Latest Looks" count={data.looks.length}>
              {data.looks.map((look) => (
                <LedgerRow key={look.id}>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="truncate text-sm font-bold text-base-content">{look.name}</h4>
                    <p className="truncate text-xs text-base-content/50 tabular-nums">
                      By user: {look.user_id.slice(0, 8)}... · {new Date(look.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconAction to={`/look/${look.id}`} title="View Look" tone="primary">
                      <Icon icon={Eye} size="sm" />
                    </IconAction>
                    <IconAction
                      title="Delete Look"
                      tone="error"
                      disabled={deletingId === look.id}
                      onClick={() => void handleDelete("look", look.id)}
                    >
                      <Icon icon={Trash} size="sm" />
                    </IconAction>
                  </div>
                </LedgerRow>
              ))}
            </LedgerSection>
          ) : null}

          {(filter === "all" || filter === "pieces") && data.pieces.length > 0 ? (
            <LedgerSection icon={TShirt} iconColor="text-secondary" label="Latest Pieces" count={data.pieces.length}>
              {data.pieces.map((piece) => (
                <LedgerRow key={piece.id}>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="truncate text-sm font-bold text-base-content">{piece.name}</h4>
                    <p className="truncate text-xs text-base-content/50 tabular-nums">
                      Slot: {piece.slot} · {new Date(piece.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconAction to={`/piece/${piece.id}`} title="View Piece" tone="primary">
                      <Icon icon={Eye} size="sm" />
                    </IconAction>
                    <IconAction
                      title="Delete Piece"
                      tone="error"
                      disabled={deletingId === piece.id}
                      onClick={() => void handleDelete("piece", piece.id)}
                    >
                      <Icon icon={Trash} size="sm" />
                    </IconAction>
                  </div>
                </LedgerRow>
              ))}
            </LedgerSection>
          ) : null}

          {(filter === "all" || filter === "comments") && data.comments.length > 0 ? (
            <LedgerSection
              icon={ChatCircle}
              iconColor="text-accent"
              label="Latest Comments"
              count={data.comments.length}
            >
              {data.comments.map((comment) => (
                <LedgerRow key={comment.id} align="start">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-base-content/50">
                      <span className="badge badge-xs badge-ghost font-extrabold text-xs">
                        {comment.targetType}
                      </span>
                      <span className="tabular-nums font-mono text-xs">
                        User: {comment.userId.slice(0, 8)}...
                      </span>
                      <span>·</span>
                      <span className="tabular-nums text-xs">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs font-medium leading-relaxed text-base-content text-pretty">
                      {comment.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 self-center">
                    <Link
                      to={comment.targetType === "look" ? `/look/${comment.targetId}` : `/piece/${comment.targetId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs min-h-[28px] gap-1 px-2.5 text-primary active:scale-[0.96] transition-transform"
                      title="View thread"
                    >
                      <Icon icon={Eye} size="xs" />
                      Target
                    </Link>
                    <IconAction
                      title="Delete Comment"
                      tone="error"
                      disabled={deletingId === comment.id}
                      onClick={() =>
                        void handleDelete(
                          "comment",
                          comment.id,
                          comment.targetType === "look" ? "look_comment" : "garment_comment",
                        )
                      }
                    >
                      <Icon icon={Trash} size="sm" />
                    </IconAction>
                  </div>
                </LedgerRow>
              ))}
            </LedgerSection>
          ) : null}

          {(filter === "all" || filter === "profiles") && data.profiles.length > 0 ? (
            <LedgerSection icon={User} iconColor="text-info" label="Latest Profiles" count={data.profiles.length}>
              {data.profiles.map((profile) => (
                <LedgerRow key={profile.id}>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <h4 className="truncate text-sm font-bold text-base-content">
                      @{profile.username}
                    </h4>
                    <p className="truncate text-xs text-base-content/50 tabular-nums">
                      Joined {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/u/${profile.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-xs min-h-[28px] px-2.5 text-primary active:scale-[0.96] transition-transform"
                    title="View Profile"
                  >
                    <Icon icon={Eye} size="xs" className="mr-1" />
                    View
                  </Link>
                </LedgerRow>
              ))}
            </LedgerSection>
          ) : null}
        </div>
      )}
    </div>
  )
}
