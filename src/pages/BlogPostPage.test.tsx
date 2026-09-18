import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BlogPostPage } from "./BlogPostPage"
import * as blogApi from "../lib/content/blog"
import { AuthContext } from "../state/auth"
import type { AuthContextValue } from "../state/auth"
import { makeAuthStub } from "../test/authStub"
import * as isAdminModule from "../state/useIsAdmin"

const roots: { root: Root; host: HTMLElement }[] = []

async function renderWithRouter(
  initialUrl: string,
  authOverrides: Omit<Partial<AuthContextValue>, "isAdmin"> & { isAdmin?: boolean } = {},
) {
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
            <Routes>
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/blog" element={<div>Blog Home</div>} />
            </Routes>
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

describe("BlogPostPage", () => {
  it("renders post title, author, thumbnail, and content", async () => {
    vi.spyOn(blogApi, "fetchBlogPostBySlug").mockResolvedValue({
      id: "post-1",
      slug: "update-v2",
      title: "Update V2 is Here",
      excerpt: "Exciting new changes.",
      content: "## Changelog\n\n- Added cool hats\n- Fixed sleeves",
      thumbnailUrl: "https://example.com/banner.png",
      category: "Update",
      isPublished: true,
      publishedAt: "2026-09-14T00:00:00Z",
      authorId: "user-1",
      author: {
        id: "user-1",
        username: "Alex",
        avatarUrl: null,
      },
      createdAt: "2026-09-14T00:00:00Z",
      updatedAt: "2026-09-14T00:00:00Z",
    })

    const host = await renderWithRouter("/blog/update-v2")

    expect(host.textContent).toContain("Update V2 is Here")
    expect(host.textContent).toContain("Alex")
    expect(host.textContent).toContain("Exciting new changes.")
    expect(host.textContent).toContain("Changelog")
    expect(host.textContent).toContain("Added cool hats")

    const banner = host.querySelector('img[src="https://example.com/banner.png"]')
    expect(banner).not.toBeNull()

    expect(document.title).toContain("Update V2 is Here")
    expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe(
      "summary_large_image",
    )
    expect(
      document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    ).toBe("https://example.com/banner.png")
  })

  it("shows admin edit shortcut when user isAdmin is true", async () => {
    vi.spyOn(blogApi, "fetchBlogPostBySlug").mockResolvedValue({
      id: "post-1",
      slug: "update-v2",
      title: "Update V2",
      excerpt: "Exciting.",
      content: "Content",
      thumbnailUrl: null,
      category: "Announcement",
      isPublished: true,
      publishedAt: "2026-09-14T00:00:00Z",
      authorId: "user-1",
      author: null,
      createdAt: "2026-09-14T00:00:00Z",
      updatedAt: "2026-09-14T00:00:00Z",
    })

    const host = await renderWithRouter("/blog/update-v2", { isAdmin: true })
    expect(host.textContent).toContain("Edit in Admin")
  })

  it("renders post not found when slug does not exist", async () => {
    vi.spyOn(blogApi, "fetchBlogPostBySlug").mockResolvedValue(null)

    const host = await renderWithRouter("/blog/missing-post")
    expect(host.textContent).toContain("Post Not Found")
    expect(host.textContent).toContain("Back to Updates")
  })
})

