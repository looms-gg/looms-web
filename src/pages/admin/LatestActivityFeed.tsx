import { useState, type ReactNode } from "react"
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
import type { RecentActivityFeed } from "../../lib/reports"
import { useLatestActivity } from "./useLatestActivity"

type ActivityFilter = "all" | "looks" | "pieces" | "comments" | "profiles"

type SimpleFeedRow = {
  id: string
  title: string
  meta: string
  href: string
  deleteType?: "look" | "piece"
}

// The looks/pieces/profiles ledgers share one row shape (title, meta, view
// link, optional delete) and render from this descriptor table. The comments
// ledger below stays a hand-written variant: its rows carry a badge, a body
// excerpt, and a target link that the simple shape cannot express.
type SimpleFeedSection = {
  key: Exclude<ActivityFilter, "all" | "comments">
  icon: IconType
  iconColor: string
  label: string
  viewTitle: string
  rows: (data: RecentActivityFeed) => SimpleFeedRow[]
}

const SIMPLE_SECTIONS: SimpleFeedSection[] = [
  {
    key: "looks",
    icon: Stack,
    iconColor: "text-primary",
    label: "Latest Looks",
    viewTitle: "View Look",
    rows: (data) =>
      data.looks.map((look) => ({
        id: look.id,
        title: look.name,
        meta: `By user: ${look.user_id.slice(0, 8)}... · ${new Date(look.created_at).toLocaleDateString()}`,
        href: `/look/${look.id}`,
        deleteType: "look" as const,
      })),
  },
  {
    key: "pieces",
    icon: TShirt,
    iconColor: "text-secondary",
    label: "Latest Pieces",
    viewTitle: "View Piece",
    rows: (data) =>
      data.pieces.map((piece) => ({
        id: piece.id,
        title: piece.name,
        meta: `Slot: ${piece.slot} · ${new Date(piece.created_at).toLocaleDateString()}`,
        href: `/piece/${piece.id}`,
        deleteType: "piece" as const,
      })),
  },
  {
    key: "profiles",
    icon: User,
    iconColor: "text-info",
    label: "Latest Profiles",
    viewTitle: "View Profile",
    rows: (data) =>
      data.profiles.map((profile) => ({
        id: profile.id,
        title: `@${profile.username}`,
        meta: `Joined ${new Date(profile.created_at).toLocaleDateString()}`,
        href: `/u/${profile.username}`,
      })),
  },
]

const ACTIVITY_FILTERS: ActivityFilter[] = ["all", "looks", "pieces", "comments", "profiles"]

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

function ActivityFilterTabs({
  current,
  onChange,
  onRefresh,
  loading,
}: {
  current: ActivityFilter
  onChange: (filter: ActivityFilter) => void
  onRefresh: () => void
  loading: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-content/10 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {ACTIVITY_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`btn btn-sm btn-pill font-bold capitalize transition-colors active:scale-[0.96] transition-transform ${
              current === f ? "btn-primary shadow-sm" : "btn-ghost text-base-content/70 hover:text-base-content"
            }`}
            onClick={() => onChange(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={onRefresh}
        className="btn btn-ghost btn-sm font-bold gap-1.5 text-base-content/70 hover:text-base-content transition-colors active:scale-[0.96] transition-transform"
        title="Refresh activity"
      >
        <Icon icon={ArrowsClockwise} className={loading ? "animate-spin" : ""} />
        Refresh
      </button>
    </div>
  )
}

function ActivitySkeleton() {
  return (
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
  )
}

function SimpleActivityRow({
  row,
  viewTitle,
  deletingId,
  onDelete,
}: {
  row: SimpleFeedRow
  viewTitle: string
  deletingId: string | null
  onDelete: (targetType: "look" | "piece", targetId: string) => void
}) {
  const handleDelete = () => {
    if (row.deleteType) {
      onDelete(row.deleteType, row.id)
    }
  }

  return (
    <LedgerRow>
      <div className="min-w-0 flex-1 space-y-0.5">
        <h4 className="truncate text-sm font-bold text-base-content">{row.title}</h4>
        <p className="truncate text-xs text-base-content/50 tabular-nums">{row.meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconAction to={row.href} title={viewTitle} tone="primary">
          <Icon icon={Eye} size="sm" />
        </IconAction>
        {row.deleteType ? (
          <IconAction
            title={`Delete ${row.deleteType === "look" ? "Look" : "Piece"}`}
            tone="error"
            disabled={deletingId === row.id}
            onClick={handleDelete}
          >
            <Icon icon={Trash} size="sm" />
          </IconAction>
        ) : null}
      </div>
    </LedgerRow>
  )
}

function SimpleActivitySection({
  section,
  data,
  deletingId,
  onDelete,
}: {
  section: SimpleFeedSection
  data: RecentActivityFeed
  deletingId: string | null
  onDelete: (targetType: "look" | "piece", targetId: string) => void
}) {
  const rows = section.rows(data)
  if (rows.length === 0) return null

  return (
    <LedgerSection
      icon={section.icon}
      iconColor={section.iconColor}
      label={section.label}
      count={rows.length}
    >
      {rows.map((row) => (
        <SimpleActivityRow
          key={row.id}
          row={row}
          viewTitle={section.viewTitle}
          deletingId={deletingId}
          onDelete={onDelete}
        />
      ))}
    </LedgerSection>
  )
}

function CommentActivityRow({
  comment,
  deletingId,
  onDelete,
}: {
  comment: RecentActivityFeed["comments"][number]
  deletingId: string | null
  onDelete: (targetType: "comment", targetId: string, subType: string) => void
}) {
  const handleDelete = () => {
    onDelete(
      "comment",
      comment.id,
      comment.targetType === "look" ? "look_comment" : "garment_comment",
    )
  }

  return (
    <LedgerRow align="start">
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
          onClick={handleDelete}
        >
          <Icon icon={Trash} size="sm" />
        </IconAction>
      </div>
    </LedgerRow>
  )
}

function CommentsLedgerSection({
  comments,
  deletingId,
  onDelete,
}: {
  comments: RecentActivityFeed["comments"]
  deletingId: string | null
  onDelete: (targetType: "comment", targetId: string, subType: string) => void
}) {
  return (
    <LedgerSection
      icon={ChatCircle}
      iconColor="text-accent"
      label="Latest Comments"
      count={comments.length}
    >
      {comments.map((comment) => (
        <CommentActivityRow
          key={comment.id}
          comment={comment}
          deletingId={deletingId}
          onDelete={onDelete}
        />
      ))}
    </LedgerSection>
  )
}

function isFeedEmpty(data: RecentActivityFeed | null): boolean {
  if (!data) return true
  return (
    data.looks.length === 0 &&
    data.pieces.length === 0 &&
    data.comments.length === 0 &&
    data.profiles.length === 0
  )
}

export function LatestActivityFeed() {
  const { data, loading, error, deletingId, load, handleDelete } = useLatestActivity()
  const [filter, setFilter] = useState<ActivityFilter>("all")

  const handleDeleteSimple = (type: "look" | "piece", id: string) => {
    void handleDelete(type, id)
  }

  const handleDeleteComment = (type: "comment", id: string, sub: string) => {
    void handleDelete(type, id, sub)
  }

  return (
    <div className="space-y-6">
      <ActivityFilterTabs
        current={filter}
        onChange={setFilter}
        onRefresh={() => void load()}
        loading={loading}
      />

      {error ? (
        <div className="alert alert-error text-sm font-bold" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <ActivitySkeleton />
      ) : isFeedEmpty(data) ? (
        <EmptyState
          title="Nothing to review yet"
          body="New community looks, pieces, and comments will show up here."
        />
      ) : (
        <div className="space-y-8">
          {SIMPLE_SECTIONS.filter(
            (section) => filter === "all" || filter === section.key,
          ).map((section) => (
            <SimpleActivitySection
              key={section.key}
              section={section}
              data={data!}
              deletingId={deletingId}
              onDelete={handleDeleteSimple}
            />
          ))}

          {/* Documented variant: comments rows carry a target badge, a body
              excerpt, and a target link the simple row shape cannot express. */}
          {(filter === "all" || filter === "comments") && data ? (
            <CommentsLedgerSection
              comments={data.comments}
              deletingId={deletingId}
              onDelete={handleDeleteComment}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
