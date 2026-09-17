import { useDeferredValue, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  Check,
  FloppyDisk,
  Image as ImageIcon,
  Link as LinkIcon,
  ListBullets,
  Quotes,
  TextHThree,
  TextHTwo,
  X,
} from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"
import { Dropdown } from "../ui/Dropdown"
import {
  type BlogCategory,
  BLOG_CATEGORIES,
  BLOG_CATEGORY_STYLES,
  isSupportedBlogImageHost,
  estimateReadingTime,
} from "../../data/blog"
import { slugify } from "../../lib/content/blog"
import { MAX_LIMITS } from "../../lib/sanitize"
import { BlogContent } from "./BlogContent"
import { BlogImageModal } from "./BlogImageModal"

export type EditorState = {
  id?: string | null
  title: string
  slug: string
  category: BlogCategory
  excerpt: string
  thumbnailUrl: string
  content: string
  isPublished: boolean
}

export const EMPTY_EDITOR: EditorState = {
  id: null,
  title: "",
  slug: "",
  category: "Update",
  excerpt: "",
  thumbnailUrl: "",
  content: "",
  isPublished: false,
}

const fieldLabel = "text-xs font-bold text-base-content/60"

type BlogPostEditorProps = {
  initial: EditorState
  saving: boolean
  error: string | null
  success: string | null
  onCancel: () => void
  onDismissSuccess: () => void
  onSave: (state: EditorState) => void
}

export function BlogPostEditor({
  initial,
  saving,
  error,
  success,
  onCancel,
  onDismissSuccess,
  onSave,
}: BlogPostEditorProps) {
  const [editorState, setEditorState] = useState<EditorState>(initial)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  // Live preview trails typing so heavy markdown renders never block keystrokes
  const deferredContent = useDeferredValue(editorState.content)

  function handleTitleChange(newTitle: string) {
    setEditorState((prev) => {
      // Auto-update slug only if creating a new post or if current slug was derived from title
      const shouldAutoSlug = !prev.id || prev.slug === slugify(prev.title)
      return {
        ...prev,
        title: newTitle,
        slug: shouldAutoSlug ? slugify(newTitle) : prev.slug,
      }
    })
  }

  function insertMarkdown(prefix: string, suffix: string = "") {
    const textarea = document.getElementById("blog-content-textarea") as HTMLTextAreaElement | null
    if (!textarea) {
      setEditorState((prev) => ({ ...prev, content: `${prev.content}\n${prefix}${suffix}` }))
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)
    const replacement = `${prefix}${selected || "text"}${suffix}`
    const newContent = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

    setEditorState((prev) => ({ ...prev, content: newContent }))

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4))
    }, 0)
  }

  function appendContent(markdown: string) {
    setEditorState((prev) => ({ ...prev, content: prev.content + markdown }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave(editorState)
  }

  return (
    <div className="space-y-5">
      {success ? (
        <div className="alert alert-success">
          <Icon icon={Check} size="sm" />
          <span className="font-bold text-sm">{success}</span>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="btn btn-ghost btn-xs btn-circle ml-auto"
          >
            <Icon icon={X} size="xs" />
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Editor top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-content/10 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost btn-sm font-bold gap-1.5"
              disabled={saving}
            >
              <Icon icon={ArrowLeft} size="sm" />
              <span className="hidden sm:inline">All posts</span>
            </button>
            <h2 className="truncate text-xl font-extrabold tracking-tight">
              {editorState.id ? "Edit Blog Post" : "Create New Blog Post"}
            </h2>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary btn-sm gap-2 font-bold"
          >
            <Icon icon={FloppyDisk} size="sm" />
            <span>{saving ? "Saving..." : "Save Post"}</span>
          </button>
        </div>

        {error ? (
          <div className="alert alert-error text-xs">
            <span>{error}</span>
          </div>
        ) : null}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          {/* Write column */}
          <div className="min-w-0 space-y-5">
            <div className="space-y-1">
              <label htmlFor="blog-title" className={fieldLabel}>
                Title
              </label>
              <input
                id="blog-title"
                type="text"
                required
                maxLength={MAX_LIMITS.BLOG_TITLE}
                value={editorState.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Studio 2.0 & New Eyes Update"
                className="input input-bordered w-full text-base font-bold"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div className="space-y-1">
                <label className={fieldLabel}>
                  Category
                </label>
                <Dropdown
                  ariaLabel="Blog category"
                  value={editorState.category}
                  onChange={(value) =>
                    setEditorState((prev) => ({
                      ...prev,
                      category: value,
                    }))
                  }
                  options={BLOG_CATEGORIES.map((cat) => ({
                    id: cat,
                    label: cat,
                  }))}
                />
              </div>

              <label className="flex cursor-pointer select-none items-center gap-3 self-end pb-1.5">
                <input
                  type="checkbox"
                  checked={editorState.isPublished}
                  onChange={(e) =>
                    setEditorState((prev) => ({
                      ...prev,
                      isPublished: e.target.checked,
                    }))
                  }
                  className="toggle toggle-primary"
                  aria-label="Publish post"
                />
                <div>
                  <span className="block text-xs font-bold">
                    {editorState.isPublished ? "Published" : "Draft"}
                  </span>
                  <span className="block text-[11px] text-base-content/50">
                    {editorState.isPublished
                      ? "Visible to all visitors"
                      : "Visible to admins only"}
                  </span>
                </div>
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="blog-slug" className={fieldLabel}>
                  URL slug
                </label>
                <span className="text-[11px] text-base-content/40 font-mono">
                  /blog/{editorState.slug || "your-slug"}
                </span>
              </div>
              <input
                id="blog-slug"
                type="text"
                required
                maxLength={MAX_LIMITS.BLOG_SLUG}
                value={editorState.slug}
                onChange={(e) =>
                  setEditorState((prev) => ({
                    ...prev,
                    slug: slugify(e.target.value),
                  }))
                }
                placeholder="studio-20-update"
                className="input input-bordered w-full font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="blog-excerpt" className={fieldLabel}>
                  Summary / excerpt
                </label>
                <span className="text-[11px] text-base-content/40 tabular-nums">
                  {editorState.excerpt.length}/{MAX_LIMITS.BLOG_EXCERPT}
                </span>
              </div>
              <textarea
                id="blog-excerpt"
                required
                rows={2}
                maxLength={MAX_LIMITS.BLOG_EXCERPT}
                value={editorState.excerpt}
                onChange={(e) =>
                  setEditorState((prev) => ({ ...prev, excerpt: e.target.value }))
                }
                placeholder="A brief summary for cards and social previews..."
                className="textarea textarea-bordered w-full text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="blog-thumbnail" className={fieldLabel}>
                Thumbnail URL (Imgur or Filegarden)
              </label>
              <div className="flex gap-2">
                <input
                  id="blog-thumbnail"
                  type="url"
                  value={editorState.thumbnailUrl}
                  onChange={(e) =>
                    setEditorState((prev) => ({
                      ...prev,
                      thumbnailUrl: e.target.value,
                    }))
                  }
                  placeholder="https://i.imgur.com/example.png"
                  className="input input-bordered flex-1 text-xs"
                />
                {editorState.thumbnailUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setEditorState((prev) => ({ ...prev, thumbnailUrl: "" }))
                    }
                    className="btn btn-ghost btn-sm btn-circle"
                    title="Clear thumbnail"
                  >
                    <Icon icon={X} size="xs" />
                  </button>
                ) : null}
              </div>
              {editorState.thumbnailUrl.trim() &&
              !isSupportedBlogImageHost(editorState.thumbnailUrl) ? (
                <p className="text-[11px] font-semibold text-warning">
                  Best to host on Imgur (i.imgur.com) or Filegarden (filegarden.com).
                </p>
              ) : null}
            </div>

            {/* Content editor with formatting toolbar */}
            <div className="space-y-2">
              <label className={fieldLabel}>Content (Markdown)</label>
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-base-200/60 p-1">
                <button
                  type="button"
                  onClick={() => insertMarkdown("## ", "\n")}
                  className="btn btn-ghost btn-xs"
                  title="Heading 2"
                >
                  <Icon icon={TextHTwo} size="xs" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("### ", "\n")}
                  className="btn btn-ghost btn-xs"
                  title="Heading 3"
                >
                  <Icon icon={TextHThree} size="xs" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("**", "**")}
                  className="btn btn-ghost btn-xs"
                  title="Bold"
                >
                  <span className="font-extrabold">B</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("*", "*")}
                  className="btn btn-ghost btn-xs"
                  title="Italic"
                >
                  <em className="text-xs">I</em>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("[", "](https://example.com)")}
                  className="btn btn-ghost btn-xs"
                  title="Insert Link"
                >
                  <Icon icon={LinkIcon} size="xs" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("- ", "\n")}
                  className="btn btn-ghost btn-xs"
                  title="Bullet List"
                >
                  <Icon icon={ListBullets} size="xs" />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("> ", "\n")}
                  className="btn btn-ghost btn-xs"
                  title="Callout / Quote"
                >
                  <Icon icon={Quotes} size="xs" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="btn btn-ghost btn-xs gap-1 font-bold text-primary"
                  title="Insert External Image"
                >
                  <Icon icon={ImageIcon} size="xs" />
                  <span>Add Image</span>
                </button>
              </div>
              <textarea
                id="blog-content-textarea"
                required
                rows={16}
                maxLength={MAX_LIMITS.BLOG_CONTENT}
                value={editorState.content}
                onChange={(e) =>
                  setEditorState((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder={`Write your post using Markdown...\n\n## Section Title\n\nParagraph text...\n\n![Image Caption](https://example.com/screenshot.png)`}
                className="textarea textarea-bordered w-full font-mono text-xs sm:text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Live preview column */}
          <aside className="space-y-2">
            <p className={fieldLabel}>Live Preview</p>
            <div className="rounded-[18px] bg-base-200 p-6 sm:p-8">
              <div className="space-y-4">
                <p className="text-xs font-bold text-base-content/60">
                  <span className={BLOG_CATEGORY_STYLES[editorState.category].text}>
                    {editorState.category}
                  </span>
                  <span className="mx-1.5 text-base-content/30">·</span>
                  <span className="tabular-nums">{estimateReadingTime(deferredContent)}</span>
                </p>
                <h3 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
                  {editorState.title || "Untitled Post"}
                </h3>
                {editorState.thumbnailUrl.trim() ? (
                  <div className="overflow-hidden rounded-[18px] bg-base-300">
                    <img
                      src={editorState.thumbnailUrl}
                      alt=""
                      className="max-h-72 w-full object-cover"
                      onError={(e) => {
                        ;(e.currentTarget as HTMLElement).style.display = "none"
                      }}
                    />
                  </div>
                ) : null}
                {editorState.excerpt ? (
                  <p className="text-sm leading-relaxed text-base-content/85 text-pretty sm:text-base">
                    {editorState.excerpt}
                  </p>
                ) : null}
                <div className="pt-2">
                  <BlogContent content={deferredContent || "*(No content yet)*"} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </form>

      {/* Kept mounted so a half-typed image prompt survives Cancel and reopen */}
      <BlogImageModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={(markdown) => {
          appendContent(markdown)
          setImageModalOpen(false)
        }}
      />
    </div>
  )
}
