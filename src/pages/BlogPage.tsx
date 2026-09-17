import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Plus, ShieldCheck } from "@phosphor-icons/react"
import { Icon } from "../components/ui/Icon"
import { HeadMeta } from "../components/shell/HeadMeta"
import { BlogCard } from "../components/blog/BlogCard"
import { EmptyState } from "../components/ui/EmptyState"
import {
  type BlogPost,
  type BlogCategory,
  BLOG_CATEGORIES,
  toBlogCategory,
} from "../data/blog"
import { fetchPublishedBlogPosts } from "../lib/content/blog"
import { formatErrorMessage } from "../lib/errorFormat"
import { useIsAdmin } from "../state/useIsAdmin"

function useBlogFeed(activeCategory: BlogCategory | null, isAdmin: boolean) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchPublishedBlogPosts({
      category: activeCategory ?? undefined,
      includeDrafts: isAdmin,
    })
      .then((data) => {
        if (!cancelled) {
          setPosts(data)
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
  }, [activeCategory, isAdmin])

  return { posts, loading, error }
}

function PlazaDispatchBanner({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="plaza-panel relative overflow-hidden rounded-[18px] p-6 sm:p-8 md:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl space-y-2">
          <p className="text-sm font-bold text-primary">Plaza dispatch</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-balance">
            News & Updates
          </h1>
          <p className="text-sm leading-relaxed text-base-content/70 sm:text-base text-pretty">
            Announcements, studio updates, and notes for your Minecraft wardrobe.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-2 pt-2 md:pt-0">
            <Link
              to="/admin"
              className="btn btn-sm btn-ghost border border-warning/30 bg-warning/10 text-warning hover:bg-warning/20 font-bold gap-1.5"
            >
              <Icon icon={ShieldCheck} size="xs" />
              <span>Manage Posts</span>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function CategoryFilterPills({
  activeCategory,
  onSelect,
}: {
  activeCategory: BlogCategory | null
  onSelect: (cat: BlogCategory | null) => void
}) {
  const pillClass = (selected: boolean) =>
    `btn btn-sm btn-pill font-bold ${
      selected
        ? "btn-primary"
        : "btn-ghost border border-base-content/15 text-base-content/75 hover:border-base-content/25"
    }`

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="Filter updates by category"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!activeCategory}
        onClick={() => onSelect(null)}
        className={pillClass(!activeCategory)}
      >
        All
      </button>
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          role="tab"
          aria-selected={activeCategory === cat}
          onClick={() => onSelect(cat)}
          className={pillClass(activeCategory === cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}

function BlogFeed({ posts }: { posts: BlogPost[] }) {
  const featuredPost = posts.length > 0 ? posts[0] : null
  const regularPosts = posts.length > 1 ? posts.slice(1) : []

  return (
    <div className="space-y-10">
      {featuredPost ? (
        <section aria-label="Featured Update">
          <BlogCard post={featuredPost} featured />
        </section>
      ) : null}

      {regularPosts.length > 0 ? (
        <section aria-label="Recent Updates" className="space-y-6">
          <div className="flex items-center justify-between border-b border-base-content/10 pb-3">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Recent updates
            </h2>
            <span className="text-xs font-bold text-base-content/50 tabular-nums">
              {regularPosts.length} {regularPosts.length === 1 ? "post" : "posts"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export function BlogPage() {
  const isAdmin = useIsAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = toBlogCategory(searchParams.get("category"))
  const { posts, loading, error } = useBlogFeed(activeCategory, isAdmin)

  function handleSelectCategory(cat: BlogCategory | null) {
    const next = new URLSearchParams(searchParams)
    if (cat) {
      next.set("category", cat)
    } else {
      next.delete("category")
    }
    setSearchParams(next)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-2 md:py-6">
      <HeadMeta
        title="News & Updates · looms"
        description="Announcements, feature updates, and patch notes for looms Minecraft wardrobe."
        url="/blog"
      />

      <PlazaDispatchBanner isAdmin={isAdmin} />
      <CategoryFilterPills activeCategory={activeCategory} onSelect={handleSelectCategory} />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-md rounded-[18px] border border-error/20 bg-error/10 p-6 text-center space-y-3">
          <p className="font-bold text-error">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-sm btn-ghost font-bold"
          >
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No updates yet"
          body={
            activeCategory
              ? `No posts published under ${activeCategory} yet.`
              : "Check back soon for new announcements and patch notes."
          }
          action={
            isAdmin ? (
              <Link to="/admin" className="btn btn-sm btn-primary font-bold mt-4 gap-2">
                <Icon icon={Plus} size="sm" />
                <span>Create First Post</span>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <BlogFeed posts={posts} />
      )}
    </div>
  )
}
