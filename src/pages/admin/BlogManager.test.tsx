import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { BlogManager } from "./BlogManager"
import * as blogApi from "../../lib/content/blog"
import type { BlogPost } from "../../data/blog"

const roots: { root: Root; host: HTMLElement }[] = []

async function renderAsync(ui: ReactNode) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(ui)
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

describe("BlogManager", () => {
  const mockPosts: BlogPost[] = [
    {
      id: "post-1",
      slug: "update-1",
      title: "Update 1",
      excerpt: "Summary of update 1",
      content: "## Hello\n\nContent here",
      thumbnailUrl: "https://example.com/thumb.png",
      category: "Update",
      isPublished: true,
      publishedAt: "2026-09-14T00:00:00Z",
      authorId: "admin-1",
      author: { id: "admin-1", username: "Admin", avatarUrl: null },
      createdAt: "2026-09-14T00:00:00Z",
      updatedAt: "2026-09-14T00:00:00Z",
    },
    {
      id: "post-2",
      slug: "draft-announcement",
      title: "Draft Announcement",
      excerpt: "Summary of draft",
      content: "Draft content",
      thumbnailUrl: null,
      category: "Announcement",
      isPublished: false,
      publishedAt: null,
      authorId: "admin-1",
      author: null,
      createdAt: "2026-09-14T00:00:00Z",
      updatedAt: "2026-09-14T00:00:00Z",
    },
  ]

  beforeEach(() => {
    vi.spyOn(blogApi, "fetchAdminBlogPosts").mockResolvedValue(mockPosts)
  })

  it("renders list of blog posts with status badges", async () => {
    const host = await renderAsync(<BlogManager />)

    expect(host.textContent).toContain("Update 1")
    expect(host.textContent).toContain("Draft Announcement")
    expect(host.textContent).toContain("Published")
    expect(host.textContent).toContain("Draft")
    expect(host.textContent).toContain("/update-1")
  })

  it("opens create post modal when New Post button is clicked", async () => {
    const host = await renderAsync(<BlogManager />)

    const newPostBtn = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("New Post"),
    )
    expect(newPostBtn).toBeDefined()

    await act(async () => {
      newPostBtn?.click()
    })

    expect(host.textContent).toContain("Create New Blog Post")
    expect(host.querySelector("input[placeholder*='Studio 2.0']")).not.toBeNull()
  })

  it("shows live preview alongside the editor", async () => {
    const host = await renderAsync(<BlogManager />)

    const newPostBtn = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("New Post"),
    )
    await act(async () => {
      newPostBtn?.click()
    })

    expect(host.textContent).toContain("Live Preview")
    expect(host.textContent).toContain("Untitled Post")
  })

  it("deletes a post when confirmation is confirmed", async () => {
    const deleteSpy = vi.spyOn(blogApi, "adminDeleteBlogPost").mockResolvedValue()
    const host = await renderAsync(<BlogManager />)

    const deleteBtns = host.querySelectorAll("button[title='Delete post']")
    expect(deleteBtns.length).toBeGreaterThan(0)

    await act(async () => {
      ;(deleteBtns[0] as HTMLButtonElement).click()
    })

    expect(host.textContent).toContain("Delete Blog Post?")

    const confirmBtn = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Delete Permanently"),
    )
    expect(confirmBtn).toBeDefined()

    await act(async () => {
      confirmBtn?.click()
    })

    expect(deleteSpy).toHaveBeenCalledWith("post-1")
  })
})

