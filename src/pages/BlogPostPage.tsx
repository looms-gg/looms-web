import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Check,
  Copy,
  PencilSimple,
  ShareNetwork,
  User,
} from "@phosphor-icons/react"
import { Icon } from "../components/ui/Icon"
import { HeadMeta } from "../components/shell/HeadMeta"
import { BlogContent } from "../components/blog/BlogContent"
import { EmptyState } from "../components/ui/EmptyState"
import {
  type BlogPost,
  BLOG_CATEGORY_STYLES,
  estimateReadingTime,
} from "../data/blog"
import { fetchBlogPostBySlug } from "../lib/content/blog"
import { formatErrorMessage } from "../lib/errorFormat"
import { useIsAdmin } from "../state/useIsAdmin"

function useBlogPost(slug: string | undefined) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchBlogPostBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setPost(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatErrorMessage(err))
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  return { post, loading, error }
}

function ArticleMeta({ post, copied, isAdmin, onCopyShareLink }: {
  post: BlogPost
  copied: boolean
  isAdmin: boolean
  onCopyShareLink: () => void
}) {
  const categoryStyle = BLOG_CATEGORY_STYLES[post.category] ?? BLOG_CATEGORY_STYLES.Update
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Draft (Unpublished)"
  const authorName = post.author?.username ?? "looms team"

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-base-content/10 pb-4">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-base-content/75 transition-colors hover:text-base-content"
        >
          <Icon icon={ArrowLeft} size="xs" />
          <span>All updates</span>
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link
              to="/admin"
              className="btn btn-xs btn-ghost border border-warning/30 bg-warning/10 text-warning font-bold gap-1.5"
            >
              <Icon icon={PencilSimple} size="xs" />
              <span>Edit in Admin</span>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={onCopyShareLink}
            className="btn btn-xs btn-ghost border border-base-content/15 text-base-content/75 font-bold gap-1.5"
            title="Copy link"
          >
            <Icon icon={copied ? Check : Copy} size="xs" className={copied ? "text-success" : ""} />
            <span>{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>
      </div>

      {/* Article Header */}
      <header className="space-y-4">
        {/* Category & Metadata */}
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold text-base-content/60">
          <span className={categoryStyle.text}>{post.category}</span>
          <span className="text-base-content/30">·</span>
          <span className="tabular-nums">{formattedDate}</span>
          <span className="text-base-content/30">·</span>
          <span>{estimateReadingTime(post.content)}</span>
          {!post.isPublished ? (
            <>
              <span className="text-base-content/30">·</span>
              <span className="text-warning">Draft</span>
            </>
          ) : null}
        </p>

        {/* Title */}
        <h1 className="text-3xl font-extrabold tracking-tight text-base-content sm:text-4xl md:text-5xl text-balance leading-tight">
          {post.title}
        </h1>

        {/* Author Attribution */}
        <div className="flex items-center gap-2.5 pt-1">
          {post.author?.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={authorName}
              className="size-7 rounded-full border border-base-content/15 object-cover"
            />
          ) : (
            <div className="grid size-7 place-items-center rounded-full bg-base-300 text-base-content/60">
              <Icon icon={User} size="xs" />
            </div>
          )}
          <span className="text-xs font-bold text-base-content/75">
            By <span className="font-extrabold text-base-content">{authorName}</span>
          </span>
        </div>
      </header>

      {/* Hero Thumbnail Banner */}
      {post.thumbnailUrl ? (
        <div className="overflow-hidden rounded-[18px] bg-base-300">
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="max-h-[480px] w-full object-cover"
          />
        </div>
      ) : null}

      {/* Lead Excerpt */}
      {post.excerpt ? (
        <p className="border-l-4 border-primary/60 pl-4 text-base leading-relaxed text-base-content/85 text-pretty sm:pl-5 sm:text-lg">
          {post.excerpt}
        </p>
      ) : null}

      {/* Main Post Content */}
      <main className="pt-2">
        <BlogContent content={post.content} />
      </main>

      {/* Footer Actions */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-base-content/10 pt-8">
        <Link
          to="/blog"
          className="btn btn-sm btn-ghost border border-base-content/15 font-bold gap-2"
        >
          <Icon icon={ArrowLeft} size="xs" />
          <span>More Updates</span>
        </Link>

        <button
          type="button"
          onClick={onCopyShareLink}
          className="btn btn-sm btn-primary font-bold gap-2"
        >
          <Icon icon={copied ? Check : ShareNetwork} size="sm" />
          <span>{copied ? "Link Copied!" : "Share this update"}</span>
        </button>
      </footer>
    </>
  )
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const isAdmin = useIsAdmin()
  const [copied, setCopied] = useState(false)
  const { post, loading, error } = useBlogPost(slug)

  function handleCopyShareLink() {
    void navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-md py-12">
        <EmptyState
          title="Post Not Found"
          body={error ?? "This update post might have been moved or is not yet published."}
          action={
            <Link to="/blog" className="btn btn-sm btn-primary rounded-full font-bold gap-2 mt-4">
              <Icon icon={ArrowLeft} size="xs" />
              <span>Back to Updates</span>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl space-y-8 py-2 md:py-6">
      <HeadMeta
        title={`${post.title} · looms`}
        description={post.excerpt}
        image={post.thumbnailUrl ?? undefined}
        url={`/blog/${post.slug}`}
        card="summary_large_image"
      />

      <ArticleMeta post={post} copied={copied} isAdmin={isAdmin} onCopyShareLink={handleCopyShareLink} />
    </article>
  )
}
