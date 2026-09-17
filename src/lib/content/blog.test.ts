import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  adminDeleteBlogPost,
  adminSaveBlogPost,
  fetchAdminBlogPosts,
  fetchBlogPostBySlug,
  fetchPublishedBlogPosts,
  isValidSlug,
  mapBlogPostRow,
  slugify,
} from "./blog"
import { supabase } from "../supabase"

describe("blog module", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("maps blog post rows and coerces author profile", () => {
    const rawRow = {
      id: "post-1",
      slug: "update-1",
      title: "Update 1",
      excerpt: "First update",
      content: "Full content",
      thumbnail_url: "https://example.com/thumb.png",
      category: "Update",
      is_published: true,
      published_at: "2026-09-14T00:00:00Z",
      author_id: "user-1",
      created_at: "2026-09-14T00:00:00Z",
      updated_at: "2026-09-14T00:00:00Z",
      profiles: {
        username: "steve",
        avatar_url: "https://example.com/avatar.png",
      },
    }

    const post = mapBlogPostRow(rawRow)
    expect(post.id).toBe("post-1")
    expect(post.slug).toBe("update-1")
    expect(post.title).toBe("Update 1")
    expect(post.category).toBe("Update")
    expect(post.author?.username).toBe("steve")
    expect(post.author?.avatarUrl).toBe("https://example.com/avatar.png")
  })

  it("fetches published blog posts and applies category filter", async () => {
    const mockData = [
      {
        id: "p1",
        slug: "cool-update",
        title: "Cool Update",
        excerpt: "Something cool",
        content: "Content",
        thumbnail_url: null,
        category: "Update",
        is_published: true,
        published_at: "2026-09-14T00:00:00Z",
        author_id: "u1",
        created_at: "2026-09-14T00:00:00Z",
        updated_at: "2026-09-14T00:00:00Z",
      },
    ]

    const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
    const eqCategoryMock = vi.fn().mockReturnValue({ order: orderMock })
    const eqPublishedMock = vi.fn().mockReturnValue({
      eq: eqCategoryMock,
      order: orderMock,
    })
    const selectMock = vi.fn().mockReturnValue({
      eq: eqPublishedMock,
    })

    vi.spyOn(supabase, "from").mockReturnValue({
      select: selectMock,
    } as never)

    const posts = await fetchPublishedBlogPosts({ category: "Update" })
    expect(posts).toHaveLength(1)
    expect(posts[0].slug).toBe("cool-update")
    expect(eqCategoryMock).toHaveBeenCalledWith("category", "Update")
  })

  it("includes drafts and orders published_at nulls last when includeDrafts is set", async () => {
    const mockData = [
      {
        id: "d1",
        slug: "draft-post",
        title: "Draft Post",
        excerpt: "Draft excerpt",
        content: "Draft content",
        thumbnail_url: null,
        category: "Update",
        is_published: false,
        published_at: null,
        author_id: "u1",
        created_at: "2026-09-15T00:00:00Z",
        updated_at: "2026-09-15T00:00:00Z",
      },
    ]

    const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
    const selectMock = vi.fn().mockReturnValue({
      order: orderMock,
    })

    vi.spyOn(supabase, "from").mockReturnValue({
      select: selectMock,
    } as never)

    const posts = await fetchPublishedBlogPosts({ includeDrafts: true })
    expect(posts).toHaveLength(1)
    expect(posts[0].slug).toBe("draft-post")
    expect(posts[0].isPublished).toBe(false)
    expect(selectMock).toHaveBeenCalledOnce()
    expect(orderMock).toHaveBeenCalledWith("published_at", {
      ascending: false,
      nullsFirst: false,
    })
  })

  it("fetches blog post by slug", async () => {
    const mockPost = {
      id: "p1",
      slug: "announcement-time",
      title: "Announcement Time",
      excerpt: "Big news",
      content: "It is big",
      thumbnail_url: "https://example.com/image.jpg",
      category: "Announcement",
      is_published: true,
      published_at: "2026-09-14T00:00:00Z",
      author_id: "u1",
      created_at: "2026-09-14T00:00:00Z",
      updated_at: "2026-09-14T00:00:00Z",
    }

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockPost, error: null })
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

    vi.spyOn(supabase, "from").mockReturnValue({
      select: selectMock,
    } as never)

    const post = await fetchBlogPostBySlug("announcement-time")
    expect(post?.title).toBe("Announcement Time")
    expect(eqMock).toHaveBeenCalledWith("slug", "announcement-time")
  })

  it("fetches all posts for admin", async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "draft-1",
          slug: "draft-post",
          title: "Draft Post",
          excerpt: "Draft excerpt",
          content: "Draft content",
          thumbnail_url: null,
          category: "Feature",
          is_published: false,
          published_at: null,
          author_id: "u1",
          created_at: "2026-09-14T00:00:00Z",
          updated_at: "2026-09-14T00:00:00Z",
        },
      ],
      error: null,
    })

    const selectMock = vi.fn().mockReturnValue({ order: orderMock })
    vi.spyOn(supabase, "from").mockReturnValue({ select: selectMock } as never)

    const posts = await fetchAdminBlogPosts()
    expect(posts).toHaveLength(1)
    expect(posts[0].isPublished).toBe(false)
  })

  it("validates and calls admin_save_blog_post RPC", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: {
        id: "saved-post",
        slug: "cool-feature",
        title: "Cool Feature",
        excerpt: "Feature excerpt",
        content: "Feature content",
        thumbnail_url: "https://example.com/thumb.png",
        category: "Feature",
        is_published: true,
        published_at: "2026-09-14T00:00:00Z",
        author_id: "admin-1",
        created_at: "2026-09-14T00:00:00Z",
        updated_at: "2026-09-14T00:00:00Z",
      },
      error: null,
    } as never)

    const saved = await adminSaveBlogPost({
      title: " Cool Feature ",
      slug: "cool-feature",
      excerpt: "Feature excerpt",
      content: "Feature content",
      thumbnailUrl: "https://example.com/thumb.png",
      category: "Feature",
      isPublished: true,
    })

    expect(saved.id).toBe("saved-post")
    expect(rpcSpy).toHaveBeenCalledWith("admin_save_blog_post", {
      p_id: null,
      p_title: "Cool Feature",
      p_slug: "cool-feature",
      p_excerpt: "Feature excerpt",
      p_content: "Feature content",
      p_thumbnail_url: "https://example.com/thumb.png",
      p_category: "Feature",
      p_is_published: true,
    })
  })

  it("throws validation error on invalid input for adminSaveBlogPost", async () => {
    await expect(
      adminSaveBlogPost({
        title: "",
        slug: "test",
        excerpt: "excerpt",
        content: "content",
        category: "Update",
        isPublished: true,
      }),
    ).rejects.toThrow(/title cannot be empty/i)

    await expect(
      adminSaveBlogPost({
        title: "Valid Title",
        slug: "",
        excerpt: "",
        content: "content",
        category: "Update",
        isPublished: true,
      }),
    ).rejects.toThrow(/excerpt cannot be empty/i)

    await expect(
      adminSaveBlogPost({
        title: "Valid Title",
        slug: "valid-slug",
        excerpt: "Valid excerpt",
        content: "",
        category: "Update",
        isPublished: true,
      }),
    ).rejects.toThrow(/content cannot be empty/i)
  })

  it("calls admin_delete_blog_post RPC", async () => {
    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: undefined,
      error: null,
    } as never)

    await adminDeleteBlogPost("post-to-delete")
    expect(rpcSpy).toHaveBeenCalledWith("admin_delete_blog_post", {
      p_id: "post-to-delete",
    })
  })
})

describe("blog slug helpers", () => {
  it("generates URL-safe slugs from titles", () => {
    expect(slugify("Hello World!")).toBe("hello-world")
    expect(slugify("Studio 2.0 & New Eyes Update")).toBe("studio-2-0-new-eyes-update")
    expect(slugify("---Messy---Title---")).toBe("messy-title")
  })

  it("validates slugs according to alphanumeric and hyphen rules", () => {
    expect(isValidSlug("hello-world")).toBe(true)
    expect(isValidSlug("update-2026")).toBe(true)
    expect(isValidSlug("invalid slug")).toBe(false)
    expect(isValidSlug("invalid--slug")).toBe(false)
    expect(isValidSlug("-invalid")).toBe(false)
    expect(isValidSlug("")).toBe(false)
  })
})
