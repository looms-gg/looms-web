import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BlogPage } from "./BlogPage"
import * as blogApi from "../lib/content/blog"
import { AuthContext } from "../state/auth"
import type { AuthContextValue } from "../state/auth"
import { makeAuthStub } from "../test/authStub"
import * as isAdminModule from "../state/useIsAdmin"
import type { BlogPost } from "../data/blog"

const roots: { root: Root; host: HTMLElement }[] = []

async function renderBlogPage(authOverrides: Omit<Partial<AuthContextValue>, "isAdmin"> & { isAdmin?: boolean } = {}, initialUrl = "/blog") {
  const isAdmin = authOverrides.isAdmin
  delete authOverrides.isAdmin
  if (isAdmin !== undefined) {
    vi.spyOn(isAdminModule, "useIsAdmin").mockReturnValue(isAdmin)
  }
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)

  const defaultAuth = makeAuthStub({ emailVerified: true, ...authOverrides })

  await act(async () => {
    flushSync(() => {
      root.render(
        <AuthContext.Provider value={defaultAuth}>
          <MemoryRouter initialEntries={[initialUrl]}>
            <BlogPage />
          </MemoryRouter>
        </AuthContext.Provider>,
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

const mockPosts: BlogPost[] = [
  {
    id: "post-1",
    slug: "studio-20-release",
    title: "Studio 2.0 is Here",
    excerpt: "New layering features, customizable eye offsets, and fresh poses.",
    content: "## Full Notes\n\nEnjoy our newest update to the 3D studio.",
    thumbnailUrl: "https://i.imgur.com/thumb1.png",
    category: "Update",
    isPublished: true,
    publishedAt: "2026-09-14T10:00:00Z",
    authorId: "user-1",
    author: {
      id: "user-1",
      username: "Alex",
      avatarUrl: null,
    },
    createdAt: "2026-09-14T09:00:00Z",
    updatedAt: "2026-09-14T10:00:00Z",
  },
  {
    id: "post-2",
    slug: "summer-contest",
    title: "Summer Wardrobe Showcase",
    excerpt: "Check out community outfits and winners from this month.",
    content: "Community showcase details here.",
    thumbnailUrl: null,
    category: "Community",
    isPublished: true,
    publishedAt: "2026-09-13T10:00:00Z",
    authorId: "user-2",
    author: {
      id: "user-2",
      username: "PyreDev",
      avatarUrl: null,
    },
    createdAt: "2026-09-13T09:00:00Z",
    updatedAt: "2026-09-13T10:00:00Z",
  },
]

const mockDraftPost: BlogPost = {
  id: "draft-1",
  slug: "upcoming-feature",
  title: "Draft Post",
  excerpt: "Sneak peek at what is coming next.",
  content: "Draft content",
  thumbnailUrl: null,
  category: "Update",
  isPublished: false,
  publishedAt: null,
  authorId: "user-1",
  author: { id: "user-1", username: "PyreDev", avatarUrl: null },
  createdAt: "2026-09-15T09:00:00Z",
  updatedAt: "2026-09-15T09:00:00Z",
}

describe("BlogPage", () => {
  it("renders plaza dispatch banner and category pills", async () => {
    vi.spyOn(blogApi, "fetchPublishedBlogPosts").mockResolvedValue([])
    const host = await renderBlogPage()

    expect(host.textContent).toContain("Plaza dispatch")
    expect(host.textContent).toContain("News & Updates")
    expect(host.textContent).toContain("All")
    expect(host.textContent).toContain("Update")
    expect(host.textContent).toContain("Announcement")
    expect(host.textContent).toContain("Feature")
    expect(host.textContent).toContain("Event")
    expect(host.textContent).toContain("Community")
  })

  it("renders empty state when there are no posts", async () => {
    vi.spyOn(blogApi, "fetchPublishedBlogPosts").mockResolvedValue([])
    const host = await renderBlogPage()

    expect(host.textContent).toContain("No updates yet")
  })

  it("renders featured and regular posts when data is present", async () => {
    vi.spyOn(blogApi, "fetchPublishedBlogPosts").mockResolvedValue(mockPosts)
    const host = await renderBlogPage()

    expect(host.textContent).toContain("Studio 2.0 is Here")
    expect(host.textContent).toContain("Summer Wardrobe Showcase")
    expect(host.textContent).toContain("Recent updates")
  })

  it("shows admin manage button when user is admin", async () => {
    vi.spyOn(blogApi, "fetchPublishedBlogPosts").mockResolvedValue([])
    const host = await renderBlogPage({ isAdmin: true })

    expect(host.textContent).toContain("Manage Posts")
  })

  it("fetches with includeDrafts for admins and shows draft posts", async () => {
    const fetchSpy = vi
      .spyOn(blogApi, "fetchPublishedBlogPosts")
      .mockResolvedValue([mockDraftPost])
    const host = await renderBlogPage({ isAdmin: true })

    expect(fetchSpy).toHaveBeenCalledWith({ includeDrafts: true, category: undefined })
    expect(host.textContent).toContain("Draft Post")
    expect(host.textContent).toContain("Draft")
  })

  it("does not include drafts for non-admins", async () => {
    const fetchSpy = vi
      .spyOn(blogApi, "fetchPublishedBlogPosts")
      .mockResolvedValue([])
    await renderBlogPage({ isAdmin: false })

    expect(fetchSpy).toHaveBeenCalledWith({ includeDrafts: false, category: undefined })
  })
})

