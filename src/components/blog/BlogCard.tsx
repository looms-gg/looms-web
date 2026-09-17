import { Link } from "react-router-dom"
import {
  type BlogPost,
  BLOG_CATEGORY_STYLES,
  estimateReadingTime,
} from "../../data/blog"
import { ArrowRight, Newspaper } from "@phosphor-icons/react"
import { Icon } from "../ui/Icon"

export type BlogCardProps = {
  post: BlogPost
  featured?: boolean
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const categoryStyle = BLOG_CATEGORY_STYLES[post.category] ?? BLOG_CATEGORY_STYLES.Update
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Draft"
  const readTime = estimateReadingTime(post.content)
  const authorName = post.author?.username ?? "looms team"

  const metaLine = (
    <p className="text-xs font-bold text-base-content/55">
      <span className={categoryStyle.text}>{post.category}</span>
      <span className="mx-1.5 text-base-content/30">·</span>
      <span className="tabular-nums">{formattedDate}</span>
      <span className="mx-1.5 text-base-content/30">·</span>
      <span>{readTime}</span>
      {!post.isPublished ? (
        <>
          <span className="mx-1.5 text-base-content/30">·</span>
          <span className="text-warning">Draft</span>
        </>
      ) : null}
    </p>
  )

  if (featured) {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group tile-lift relative block overflow-hidden rounded-[18px] bg-base-200 text-inherit no-underline transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="relative aspect-video w-full overflow-hidden bg-base-300 md:col-span-7 md:aspect-auto md:min-h-[320px]">
            {post.thumbnailUrl ? (
              <img
                src={post.thumbnailUrl}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full min-h-[220px] w-full place-items-center bg-base-300 text-base-content/25">
                <Icon icon={Newspaper} size="xl" className="size-16" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 md:col-span-5 md:p-10">
            <div className="space-y-3">
              {metaLine}

              <h2 className="text-2xl font-extrabold tracking-tight text-base-content sm:text-3xl md:text-4xl text-balance">
                {post.title}
              </h2>

              <p className="text-sm leading-relaxed text-base-content/75 line-clamp-3 text-pretty sm:text-base">
                {post.excerpt}
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-base-content/75">
                {authorName}
              </span>

              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-primary">
                <span>Read Article</span>
                <Icon
                  icon={ArrowRight}
                  size="sm"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group tile-lift relative flex flex-col overflow-hidden rounded-[18px] bg-base-200 text-inherit no-underline transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-base-300">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-base-300 text-base-content/25">
            <Icon icon={Newspaper} size="lg" className="size-12" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
        {metaLine}

        <h3 className="text-lg font-extrabold tracking-tight text-base-content line-clamp-2 text-balance">
          {post.title}
        </h3>

        <p className="text-xs leading-relaxed text-base-content/70 line-clamp-2 text-pretty sm:text-sm">
          {post.excerpt}
        </p>

        <p className="mt-auto pt-2 text-xs font-bold text-base-content/60">
          {authorName}
        </p>
      </div>
    </Link>
  )
}
