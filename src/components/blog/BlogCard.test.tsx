import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BlogCard } from "./BlogCard"
import type { BlogPost } from "../../data/blog"

const roots: { root: Root; host: HTMLElement }[] = []

async function renderCard(post: BlogPost, featured = false) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(
        <MemoryRouter>
          <BlogCard post={post} featured={featured} />
        </MemoryRouter>,
      )
    })
    await Promise.resolve()
  })
  roots.push({ root, host })
  return host
}

afterEach(() => {
  for (const { root, host } of roots.splice(0)) {
    flushSync(() => {
      root.unmount()
    })
    host.remove()
  }
  vi.restoreAllMocks()
})

const samplePost: BlogPost = {
  id: "test-post-1",
  slug: "hivemc-update",
  title: "Summer Festival & Studio Improvements",
  excerpt: "Discover the latest enhancements to looms studio and new festive outfits.",
  content: "Here is the full text describing the summer festival with several exciting announcements.",
  thumbnailUrl: "https://i.imgur.com/example.png",
  category: "Feature",
  isPublished: true,
  publishedAt: "2026-09-14T12:00:00Z",
  authorId: "user-1",
  author: {
    id: "user-1",
    username: "AlexCrafter",
    avatarUrl: null,
  },
  createdAt: "2026-09-14T10:00:00Z",
  updatedAt: "2026-09-14T12:00:00Z",
}

describe("BlogCard component", () => {
  it("renders a standard card with category, title, excerpt, and reading time", async () => {
    const host = await renderCard(samplePost, false)
    expect(host.textContent).toContain("Summer Festival & Studio Improvements")
    expect(host.textContent).toContain("Discover the latest enhancements")
    expect(host.textContent).toContain("Feature")
    expect(host.textContent).toContain("min read")
    expect(host.textContent).toContain("AlexCrafter")

    const anchor = host.querySelector("a")
    expect(anchor).not.toBeNull()
    expect(anchor?.getAttribute("href")).toBe("/blog/hivemc-update")
  })

  it("renders a featured hero banner with call to action", async () => {
    const host = await renderCard(samplePost, true)
    expect(host.textContent).toContain("Summer Festival & Studio Improvements")
    expect(host.textContent).toContain("Read Article")
    expect(host.textContent).toContain("Feature")
    expect(host.textContent).toContain("AlexCrafter")
    expect(host.textContent).toContain("min read")

    const anchor = host.querySelector("a")
    expect(anchor?.getAttribute("href")).toBe("/blog/hivemc-update")
  })

  it("shows draft badge when post is not published", async () => {
    const draftPost: BlogPost = { ...samplePost, isPublished: false, publishedAt: null }
    const host = await renderCard(draftPost, false)
    expect(host.textContent).toContain("Draft")
  })
})

