import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChatCircle,
  Eye,
  ArrowsClockwise,
  TShirt,
  Trash,
  User,
  Sparkle,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  adminDeleteContent,
  fetchRecentPlatformActivity,
  type RecentActivityFeed,
} from "../../lib/reports"

type ActivityFilter = "all" | "looks" | "pieces" | "comments" | "profiles"

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
              className={`btn btn-sm rounded-full font-bold capitalize transition-colors active:scale-[0.96] transition-transform ${
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
          className="btn btn-ghost btn-sm rounded-full font-bold gap-1.5 text-base-content/70 hover:text-base-content transition-colors active:scale-[0.96] transition-transform"
          title="Refresh activity"
        >
          <Icon icon={ArrowsClockwise} className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
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
          <div className="space-y-3">
            <div className="h-4 w-32 rounded-full bg-base-content/10 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl border border-base-content/10 bg-base-200/40 p-3.5 space-y-2 animate-pulse"
                >
                  <div className="h-4 w-3/4 rounded-lg bg-base-content/10" />
                  <div className="h-3 w-1/2 rounded-lg bg-base-content/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !data ? null : (
        <div className="space-y-8">
          {/* Looks */}
          {(filter === "all" || filter === "looks") && data.looks.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                <Icon icon={Sparkle} className="size-3 text-primary" />
                Latest Looks ({data.looks.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.looks.map((look) => (
                  <div
                    key={look.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-200/50 p-3.5 transition-colors hover:border-base-content/20 hover:bg-base-200/80 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-sm font-bold truncate text-base-content">{look.name}</h4>
                      <p className="text-xs text-base-content/50 truncate tabular-nums">
                        By user: {look.user_id.slice(0, 8)}... · {new Date(look.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        to={`/look/${look.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs size-8 rounded-full text-primary hover:bg-primary/15 active:scale-[0.96] transition-transform"
                        title="View Look"
                      >
                        <Icon icon={Eye} className="size-3.5" />
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === look.id}
                        onClick={() => void handleDelete("look", look.id)}
                        className="btn btn-ghost btn-xs size-8 rounded-full text-error hover:bg-error/20 active:scale-[0.96] transition-transform"
                        title="Delete Look"
                      >
                        <Icon icon={Trash} className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Pieces */}
          {(filter === "all" || filter === "pieces") && data.pieces.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                <Icon icon={TShirt} className="size-3 text-secondary" />
                Latest Pieces ({data.pieces.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.pieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-200/50 p-3.5 transition-colors hover:border-base-content/20 hover:bg-base-200/80 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-sm font-bold truncate text-base-content">{piece.name}</h4>
                      <p className="text-xs text-base-content/50 truncate tabular-nums">
                        Slot: {piece.slot} · {new Date(piece.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        to={`/piece/${piece.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs size-8 rounded-full text-primary hover:bg-primary/15 active:scale-[0.96] transition-transform"
                        title="View Piece"
                      >
                        <Icon icon={Eye} className="size-3.5" />
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === piece.id}
                        onClick={() => void handleDelete("piece", piece.id)}
                        className="btn btn-ghost btn-xs size-8 rounded-full text-error hover:bg-error/20 active:scale-[0.96] transition-transform"
                        title="Delete Piece"
                      >
                        <Icon icon={Trash} className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Comments */}
          {(filter === "all" || filter === "comments") && data.comments.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                <Icon icon={ChatCircle} className="size-3 text-accent" />
                Latest Comments ({data.comments.length})
              </h3>
              <div className="space-y-2">
                {data.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-200/50 p-3.5 transition-colors hover:border-base-content/20 hover:bg-base-200/80 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-base-content/50">
                        <span className="badge badge-xs badge-ghost uppercase font-extrabold tracking-wider text-xs">
                          {comment.targetType}
                        </span>
                        <span className="tabular-nums font-mono text-xs">User: {comment.userId.slice(0, 8)}...</span>
                        <span>·</span>
                        <span className="tabular-nums text-xs">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-base-content line-clamp-2 leading-relaxed font-medium text-pretty">
                        {comment.body}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 self-center">
                      <Link
                        to={comment.targetType === "look" ? `/look/${comment.targetId}` : `/piece/${comment.targetId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-ghost btn-xs min-h-[28px] px-2.5 rounded-full gap-1 text-primary active:scale-[0.96] transition-transform"
                        title="View thread"
                      >
                        <Icon icon={Eye} className="size-3" />
                        Target
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === comment.id}
                        onClick={() =>
                          void handleDelete(
                            "comment",
                            comment.id,
                            comment.targetType === "look" ? "look_comment" : "garment_comment",
                          )
                        }
                        className="btn btn-ghost btn-xs size-8 rounded-full text-error hover:bg-error/20 active:scale-[0.96] transition-transform"
                        title="Delete Comment"
                      >
                        <Icon icon={Trash} className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Profiles */}
          {(filter === "all" || filter === "profiles") && data.profiles.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                <Icon icon={User} className="size-3 text-info" />
                Latest Profiles ({data.profiles.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-base-content/10 bg-base-200/50 p-3.5 transition-colors hover:border-base-content/20 hover:bg-base-200/80 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4 className="text-sm font-black truncate text-base-content">
                        @{profile.username}
                      </h4>
                      <p className="text-xs text-base-content/50 truncate tabular-nums">
                        Joined {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      to={`/u/${profile.username}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-xs min-h-[28px] px-2.5 rounded-full text-primary active:scale-[0.96] transition-transform"
                      title="View Profile"
                    >
                      <Icon icon={Eye} className="size-3 mr-1" />
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
