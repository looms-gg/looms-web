import { describe, expect, it } from "vitest"
import {
  estimateReadingTime,
  isSupportedBlogImageHost,
  normalizeBlogImageUrl,
} from "./blog"

describe("blog data helpers", () => {
  it("validates supported image hosts (Imgur and Filegarden)", () => {
    // Imgur
    expect(isSupportedBlogImageHost("https://i.imgur.com/abc1234.png")).toBe(true)
    expect(isSupportedBlogImageHost("https://imgur.com/abc1234")).toBe(true)
    expect(isSupportedBlogImageHost("http://i.imgur.com/xyz.jpg")).toBe(true)

    // Filegarden
    expect(isSupportedBlogImageHost("https://filegarden.com/user/asset.png")).toBe(true)
    expect(isSupportedBlogImageHost("https://cdn.filegarden.com/user/asset.png")).toBe(true)

    // Unsupported or malformed
    expect(isSupportedBlogImageHost("https://example.com/image.png")).toBe(false)
    expect(isSupportedBlogImageHost("javascript:alert(1)")).toBe(false)
    expect(isSupportedBlogImageHost(null)).toBe(false)
    expect(isSupportedBlogImageHost("")).toBe(false)
  })

  it("normalizes Imgur URLs to direct image URLs", () => {
    expect(normalizeBlogImageUrl("https://imgur.com/abc1234")).toBe(
      "https://i.imgur.com/abc1234.png",
    )
    expect(normalizeBlogImageUrl("https://i.imgur.com/abc1234.png")).toBe(
      "https://i.imgur.com/abc1234.png",
    )
    expect(normalizeBlogImageUrl("https://filegarden.com/user/pic.jpg")).toBe(
      "https://filegarden.com/user/pic.jpg",
    )
  })

  it("estimates reading time correctly based on word count", () => {
    expect(estimateReadingTime("")).toBe("1 min read")
    expect(estimateReadingTime(null)).toBe("1 min read")
    expect(estimateReadingTime("Quick update with only a few words.")).toBe("1 min read")

    // 450 words should be 3 min read (ceil(450 / 200) = 3)
    const longText = Array(450).fill("word").join(" ")
    expect(estimateReadingTime(longText)).toBe("3 min read")
  })
})
