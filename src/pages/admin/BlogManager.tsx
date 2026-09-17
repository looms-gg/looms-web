import { useEffect, useState } from "react"
import {
  ArrowSquareOut,
  Check,
  Newspaper,
  PencilSimple,
  Plus,
  Trash,
  X,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { normalizeBlogImageUrl, type BlogPost, BLOG_CATEGORY_STYLES } from "../../data/blog"
import {
  adminDeleteBlogPost,
  adminSaveBlogPost,
  fetchAdminBlogPosts,
} from "../../lib/content/blog"
import { formatErrorMessage } from "../../lib/errorFormat"
import {
  BlogPostEditor,
  EMPTY_EDITOR,
  type EditorState,
} from "../../components/blog/BlogPostEditor"

export function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorInitial, setEditorInitial] = useState<EditorState>(EMPTY_EDITOR)
  const [saving, setSaving] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function loadPosts() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminBlogPosts()
      setPosts(data)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  function openCreateEditor() {
    setEditorInitial(EMPTY_EDITOR)
    setEditorError(null)
    setEditorOpen(true)
  }

  function openEditEditor(post: BlogPost) {
    setEditorInitial({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt,
      thumbnailUrl: post.thumbnailUrl ?? "",
      content: post.content,
      isPublished: post.isPublished,
    })
    setEditorError(null)
    setEditorOpen(true)
  }

  async function handleSavePost(state: EditorState) {
    setSaving(true)
    setEditorError(null)
    setSuccess(null)

    const rawThumb = state.thumbnailUrl.trim()
    const normalizedThumb = rawThumb ? normalizeBlogImageUrl(rawThumb) || rawThumb : null

    try {
      const saved = await adminSaveBlogPost({
        id: state.id,
        title: state.title,
        slug: state.slug,
        category: state.category,
        excerpt: state.excerpt,
        thumbnailUrl: normalizedThumb,
        content: state.content,
        isPublished: state.isPublished,
      })

      setEditorOpen(false)
      setSuccess(`Post "${saved.title}" saved successfully.`)
      await loadPosts()
    } catch (err) {
      setEditorError(formatErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePost(id: string) {
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      await adminDeleteBlogPost(id)
      setDeleteConfirmId(null)
      setSuccess("Post deleted successfully.")
      await loadPosts()
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  if (editorOpen) {
    return (
      <BlogPostEditor
        initial={editorInitial}
        saving={saving}
        error={editorError}
        success={success}
        onCancel={() => setEditorOpen(false)}
        onDismissSuccess={() => setSuccess(null)}
        onSave={handleSavePost}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {success ? (
        <div className="alert alert-success">
          <Icon icon={Check} size="sm" />
          <span className="font-bold text-sm">{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="btn btn-ghost btn-xs btn-circle ml-auto"
          >
            <Icon icon={X} size="xs" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-error">
          <span className="font-bold text-sm">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="btn btn-ghost btn-xs btn-circle ml-auto"
          >
            <Icon icon={X} size="xs" />
          </button>
        </div>
      ) : null}

      {/* Header with New Post Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Blog & Updates Manager</h1>
          <p className="text-xs text-base-content/60">
            Publish announcements, patch notes, and guides for the looms community.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateEditor}
          className="btn btn-primary btn-sm gap-2 font-bold"
        >
          <Icon icon={Plus} size="sm" />
          <span>New Post</span>
        </button>
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-base-content/15 p-12 text-center space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-base-200 text-base-content/40">
            <Icon icon={Newspaper} size="lg" />
          </div>
          <p className="text-sm font-bold text-base-content/70">No blog posts found</p>
          <p className="text-xs text-base-content/50">
            Click &quot;New Post&quot; to write your first announcement or changelog.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => {
            const catStyle = BLOG_CATEGORY_STYLES[post.category] ?? BLOG_CATEGORY_STYLES.Update
            return (
              <div
                key={post.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[18px] bg-base-200/40 p-4 transition-colors hover:bg-base-200/70"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Mini Thumbnail */}
                  <div className="aspect-video w-24 shrink-0 overflow-hidden rounded-xl bg-base-300">
                    {post.thumbnailUrl ? (
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-base-content/30">
                        <Icon icon={Newspaper} size="sm" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-bold">
                      <span className={catStyle.text}>{post.category}</span>
                      <span className="text-base-content/30">·</span>
                      <span className={post.isPublished ? "text-success" : "text-warning"}>
                        {post.isPublished ? "Published" : "Draft"}
                      </span>
                      <span className="text-base-content/30">·</span>
                      <span className="font-mono text-base-content/50">/{post.slug}</span>
                    </p>

                    <h3 className="truncate text-sm font-extrabold text-base-content sm:text-base">
                      {post.title}
                    </h3>

                    <p className="max-w-lg truncate text-xs text-base-content/60">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {post.isPublished ? (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-xs gap-1 text-base-content/70"
                      title="View public post"
                    >
                      <Icon icon={ArrowSquareOut} size="xs" />
                      <span>View</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openEditEditor(post)}
                    className="btn btn-ghost btn-xs font-bold gap-1"
                  >
                    <Icon icon={PencilSimple} size="xs" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(post.id)}
                    className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
                    title="Delete post"
                  >
                    <Icon icon={Trash} size="xs" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId ? (
        <div className="modal modal-open">
          <div className="modal-box max-w-sm space-y-4">
            <h3 className="text-lg font-extrabold text-error">Delete Blog Post?</h3>
            <p className="text-xs text-base-content/70">
              This action cannot be undone. The post will be permanently deleted from the database.
            </p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-ghost btn-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePost(deleteConfirmId)}
                className="btn btn-error btn-sm font-bold"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteConfirmId(null)} />
        </div>
      ) : null}
    </div>
  )
}
