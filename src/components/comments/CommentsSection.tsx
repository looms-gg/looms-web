import { useEffect, useId, useState } from "react"
import { faReply, faTrash, faPen, faFlag } from "@fortawesome/free-solid-svg-icons"
import {
  createGarmentComment,
  createLookComment,
  deleteGarmentComment,
  deleteLookComment,
  fetchGarmentComments,
  fetchLookComments,
  nestComments,
  updateGarmentComment,
  updateLookComment,
  type CommentItem,
  type CommentTargetType,
} from "../../state/comments"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS } from "../../lib/sanitize"
import { useAuthOptional } from "../../state/auth"
import { AuthModal } from "../auth/AuthModal"
import { ReportModal } from "../moderation/ReportModal"
import { FaIcon } from "../ui/FaIcon"
import { MakerLink } from "../piece/MakerLink"

function formatWhen(ts: number) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function CommentComposer({
  placeholder,
  submitLabel,
  initial = "",
  disabled,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  submitLabel: string
  initial?: string
  disabled?: boolean
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
}) {
  const id = useId()
  const [body, setBody] = useState(initial)
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (busy || disabled) return
        setBusy(true)
        void onSubmit(body)
          .then(() => {
            setBody("")
          })
          .finally(() => setBusy(false))
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {placeholder}
      </label>
      <textarea
        id={id}
        className="textarea textarea-bordered min-h-24 w-full rounded-2xl bg-base-100 text-sm leading-relaxed"
        placeholder={placeholder}
        maxLength={MAX_LIMITS.COMMENT}
        value={body}
        disabled={busy || disabled}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="btn btn-primary btn-sm min-h-10 rounded-full font-extrabold active:scale-[0.96] transition-transform"
          disabled={busy || disabled || !body.trim()}
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-10 rounded-full font-bold active:scale-[0.96] transition-transform"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        ) : null}
        <span className="ml-auto text-xs font-bold tabular-nums text-base-content/45">
          {body.length}/{MAX_LIMITS.COMMENT}
        </span>
      </div>
    </form>
  )
}

function CommentCard({
  comment,
  depth,
  viewerId,
  targetType,
  ownerId,
  onChanged,
}: {
  comment: CommentItem & { replies?: CommentItem[] }
  depth: 0 | 1
  viewerId: string | null
  targetType: CommentTargetType
  ownerId?: string
  onChanged: () => void
}) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const isAuthor = Boolean(viewerId && viewerId === comment.userId)
  const canDelete = Boolean(
    viewerId && (viewerId === comment.userId || viewerId === ownerId),
  )

  return (
    <article
      className={`space-y-3 ${
        depth === 1 ? "ml-6 border-l border-base-content/10 pl-4" : ""
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <MakerLink
          username={comment.username}
          prefix=""
          className="text-sm font-extrabold text-primary"
        />
        <time
          className="text-xs font-bold text-base-content/45"
          dateTime={new Date(comment.createdAt).toISOString()}
          title={new Date(comment.createdAt).toLocaleString()}
        >
          {formatWhen(comment.createdAt)}
        </time>
      </div>

      {editing ? (
        <CommentComposer
          placeholder="Edit your comment"
          submitLabel="Save"
          initial={comment.body}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            setError(null)
            if (!viewerId) return
            try {
              if (targetType === "garment") {
                await updateGarmentComment({
                  id: comment.id,
                  userId: viewerId,
                  body,
                })
              } else {
                await updateLookComment({
                  id: comment.id,
                  userId: viewerId,
                  body,
                })
              }
              setEditing(false)
              onChanged()
            } catch (err) {
              setError(formatErrorMessage(err))
            }
          }}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-base-content/85">
          {comment.body}
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {depth === 0 ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold active:scale-[0.96] transition-transform"
            title="Reply"
            onClick={() => {
              if (!viewerId) {
                setAuthOpen(true)
                return
              }
              setReplyOpen((open) => !open)
            }}
          >
            <FaIcon icon={faReply} className="size-3 mr-1" />
            Reply
          </button>
        ) : null}
        {isAuthor ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold active:scale-[0.96] transition-transform"
            title="Edit comment"
            onClick={() => setEditing(true)}
          >
            <FaIcon icon={faPen} className="size-3 mr-1" />
            Edit
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold text-error active:scale-[0.96] transition-transform"
            title="Delete comment"
            onClick={() => {
              if (!viewerId) return
              setError(null)
              const delPromise =
                targetType === "garment"
                  ? deleteGarmentComment({ id: comment.id, userId: viewerId })
                  : deleteLookComment({ id: comment.id, userId: viewerId })
              void delPromise
                .then(() => onChanged())
                .catch((err) => setError(formatErrorMessage(err)))
            }}
          >
            <FaIcon icon={faTrash} className="size-3 mr-1" />
            Delete
          </button>
        ) : null}
        {!isAuthor ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold opacity-60 hover:opacity-100 active:scale-[0.96] transition-opacity"
            title="Report comment"
            aria-label="Report comment"
            onClick={() => {
              if (!viewerId) {
                setAuthOpen(true)
                return
              }
              setReportOpen(true)
            }}
          >
            <FaIcon icon={faFlag} className="size-3 mr-1" />
            Report
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm font-bold text-error" role="alert">
          {error}
        </p>
      ) : null}

      {replyOpen ? (
        <CommentComposer
          placeholder="Write a reply"
          submitLabel="Reply"
          onCancel={() => setReplyOpen(false)}
          onSubmit={async (body) => {
            setError(null)
            if (!viewerId) return
            try {
              if (targetType === "garment") {
                await createGarmentComment({
                  garmentId: comment.targetId,
                  userId: viewerId,
                  parentId: comment.id,
                  body,
                })
              } else {
                await createLookComment({
                  lookId: comment.targetId,
                  userId: viewerId,
                  parentId: comment.id,
                  body,
                })
              }
              setReplyOpen(false)
              onChanged()
            } catch (err) {
              setError(formatErrorMessage(err))
            }
          }}
        />
      ) : null}

      {comment.replies?.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          depth={1}
          viewerId={viewerId}
          targetType={targetType}
          ownerId={ownerId}
          onChanged={onChanged}
        />
      ))}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      {viewerId ? (
        <ReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetType="comment"
          targetId={comment.id}
          targetSubType={targetType === "garment" ? "garment_comment" : "look_comment"}
          targetLabel={`Comment by @${comment.username}`}
          reporterId={viewerId}
        />
      ) : null}
    </article>
  )
}

export function CommentsSection({
  targetType,
  targetId,
  ownerId,
  isPublic = true,
}: {
  targetType: CommentTargetType
  targetId: string
  ownerId?: string
  isPublic?: boolean
}) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const [threads, setThreads] = useState<
    Array<CommentItem & { replies: CommentItem[] }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const canView = isPublic || user?.id === ownerId

  async function reload() {
    setLoading(true)
    try {
      const comments: CommentItem[] =
        targetType === "garment"
          ? await fetchGarmentComments(targetId)
          : await fetchLookComments(targetId)
      setError(null)
      setThreads(nestComments(comments))
    } catch (err) {
      setError(formatErrorMessage(err))
      setThreads([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!canView) return
    void reload()
  }, [targetType, targetId, canView])

  if (!canView) {
    return null
  }

  const commentCount = threads.reduce((n, t) => n + 1 + t.replies.length, 0)

  return (
    <section className="rounded-[22px] bg-base-200 p-5 md:p-7" aria-label="Comments">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-lg font-extrabold tracking-tight">Comments</h2>
        <span className="text-xs font-extrabold tabular-nums text-base-content/50">
          {commentCount}
        </span>
      </div>

      {user ? (
        <div className="mb-6">
          <CommentComposer
            placeholder="Add a comment"
            submitLabel="Post"
            onSubmit={async (body) => {
              setError(null)
              try {
                if (targetType === "garment") {
                  await createGarmentComment({
                    garmentId: targetId,
                    userId: user.id,
                    body,
                  })
                } else {
                  await createLookComment({
                    lookId: targetId,
                    userId: user.id,
                    body,
                  })
                }
                await reload()
              } catch (err) {
                setError(formatErrorMessage(err))
              }
            }}
          />
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-base-content/60">
            Sign in to leave a comment.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm min-h-10 rounded-full font-extrabold"
            onClick={() => setAuthOpen(true)}
          >
            Sign in
          </button>
        </div>
      )}

      {error ? (
        <p className="mb-4 text-sm font-bold text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm font-bold text-base-content/50">Loading comments…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm font-bold text-base-content/50">No comments yet.</p>
      ) : (
        <div className="space-y-6">
          {threads.map((thread) => (
            <CommentCard
              key={thread.id}
              comment={thread}
              depth={0}
              viewerId={user?.id ?? null}
              targetType={targetType}
              ownerId={ownerId}
              onChanged={() => {
                void reload()
              }}
            />
          ))}
        </div>
      )}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  )
}
