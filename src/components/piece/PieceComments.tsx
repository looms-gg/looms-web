import { useEffect, useId, useState } from "react"
import { faReply, faTrash, faPen } from "@fortawesome/free-solid-svg-icons"
import {
  createGarmentComment,
  deleteGarmentComment,
  fetchGarmentComments,
  nestComments,
  updateGarmentComment,
  type GarmentComment,
} from "../../state/comments"
import { formatErrorMessage } from "../../lib/errorFormat"
import { MAX_LIMITS } from "../../lib/sanitize"
import { useAuthOptional } from "../../state/auth"
import { AuthModal } from "../auth/AuthModal"
import { FaIcon } from "../ui/FaIcon"
import { MakerLink } from "./MakerLink"

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
          className="btn btn-primary btn-sm min-h-10 rounded-full font-extrabold"
          disabled={busy || disabled || !body.trim()}
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-10 rounded-full font-bold"
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
  garmentOwnerId,
  onChanged,
}: {
  comment: GarmentComment & { replies?: GarmentComment[] }
  depth: 0 | 1
  viewerId: string | null
  garmentOwnerId?: string
  onChanged: () => void
}) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const isAuthor = Boolean(viewerId && viewerId === comment.userId)
  const canDelete = Boolean(
    viewerId && (viewerId === comment.userId || viewerId === garmentOwnerId),
  )

  return (
    <article className={`space-y-3 ${depth === 1 ? "ml-6 border-l border-base-content/10 pl-4" : ""}`}>
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
              await updateGarmentComment({
                id: comment.id,
                userId: viewerId,
                body,
              })
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
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold"
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
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold"
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
            className="btn btn-ghost btn-xs min-h-9 rounded-full font-bold text-error"
            title="Delete comment"
            onClick={() => {
              setError(null)
              void deleteGarmentComment({ id: comment.id, userId: viewerId })
                .then(() => onChanged())
                .catch((err) => setError(formatErrorMessage(err)))
            }}
          >
            <FaIcon icon={faTrash} className="size-3 mr-1" />
            Delete
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
              await createGarmentComment({
                garmentId: comment.garmentId,
                userId: viewerId,
                parentId: comment.id,
                body,
              })
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
          garmentOwnerId={garmentOwnerId}
          onChanged={onChanged}
        />
      ))}

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </article>
  )
}

export function PieceComments({
  garmentId,
  garmentOwnerId,
  isPublic = true,
}: {
  garmentId: string
  garmentOwnerId?: string
  isPublic?: boolean
}) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const [threads, setThreads] = useState<
    Array<GarmentComment & { replies: GarmentComment[] }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const canView = isPublic || user?.id === garmentOwnerId

  async function reload() {
    setLoading(true)
    try {
      const comments = await fetchGarmentComments(garmentId)
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
  }, [garmentId, canView])

  if (!canView) {
    return null
  }

  return (
    <section className="rounded-[22px] bg-base-200 p-5 md:p-7" aria-label="Comments">
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-lg font-extrabold tracking-tight">Comments</h2>
        <span className="text-xs font-extrabold tabular-nums text-base-content/50">
          {threads.reduce((n, t) => n + 1 + t.replies.length, 0)}
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
                await createGarmentComment({
                  garmentId,
                  userId: user.id,
                  body,
                })
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
              garmentOwnerId={garmentOwnerId}
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
