import { describe, it, expect } from "vitest"
import { formatErrorMessage } from "./errorFormat"

describe("formatErrorMessage", () => {
  it("translates garment rate limit error messages", () => {
    const err = {
      message: "Rate limit exceeded for garment_create: maximum 15 requests per 600 seconds.",
    }
    expect(formatErrorMessage(err)).toContain("Upload rate limit reached")
  })

  it("translates texture upload rate limit error messages", () => {
    const err = new Error("Rate limit exceeded for texture_upload: maximum 15 requests per 600 seconds.")
    expect(formatErrorMessage(err)).toContain("Upload rate limit reached")
  })

  it("translates look save rate limit error messages", () => {
    const err = {
      message: "Rate limit exceeded for look_create: maximum 30 requests per 600 seconds.",
    }
    expect(formatErrorMessage(err)).toContain("Save rate limit reached")
  })

  it("translates profile update rate limit error messages", () => {
    const err = "Rate limit exceeded for profile_update: maximum 10 requests per 300 seconds."
    expect(formatErrorMessage(err)).toContain("Profile update rate limit reached")
  })

  it("translates generic rate limit error messages", () => {
    const err = { message: "Too many requests, please slow down." }
    expect(formatErrorMessage(err)).toContain("Rate limit reached")
  })

  it("translates garment quota error messages", () => {
    const err = {
      message: "Account quota exceeded: maximum 150 garments allowed per account.",
    }
    expect(formatErrorMessage(err)).toContain("Garment storage full (max 150 items)")
  })

  it("translates look quota error messages", () => {
    const err = {
      message: "Account quota exceeded: maximum 100 looks allowed per account.",
    }
    expect(formatErrorMessage(err)).toContain("Look storage full (max 100 looks)")
  })

  it("translates file size restrictions", () => {
    const err = { message: "File size exceeds server maximum of 2MB." }
    expect(formatErrorMessage(err)).toContain("File is too large")
  })

  it("translates invalid file type restrictions", () => {
    const err = { message: "Invalid file type: garment textures must be .png files." }
    expect(formatErrorMessage(err)).toContain("Invalid file format")
  })

  it("preserves standard error strings when not a security/limit trigger", () => {
    const err = new Error("Database connection lost.")
    expect(formatErrorMessage(err)).toBe("Database connection lost.")
  })

  it("returns fallback message for empty or null error inputs", () => {
    expect(formatErrorMessage(null)).toBe("An unexpected error occurred. Please try again.")
    expect(formatErrorMessage(undefined)).toBe("An unexpected error occurred. Please try again.")
    expect(formatErrorMessage({})).toBe("An unexpected error occurred. Please try again.")
  })

  it("translates username cooldown errors", () => {
    const err = {
      message: "Username can only be changed once every 15 days. Next change available after 2026-09-22.",
    }
    expect(formatErrorMessage(err)).toMatch(/username/i)
    expect(formatErrorMessage(err)).toMatch(/15 days/i)
  })

  it("translates like rate limit errors", () => {
    const err = { message: "Rate limit exceeded for like_create: maximum 60 requests per 600 seconds." }
    expect(formatErrorMessage(err)).toContain("Like rate limit")
  })

  it("translates like quota errors", () => {
    const err = { message: "Account quota exceeded: maximum 5000 likes allowed per account." }
    expect(formatErrorMessage(err)).toContain("liked items")
  })

  it("translates wardrobe add rate limit errors", () => {
    const err = {
      message: "Rate limit exceeded for wardrobe_add: maximum 60 requests per 600 seconds.",
    }
    expect(formatErrorMessage(err)).toContain("Wardrobe add rate limit")
  })

  it("translates wardrobe quota errors", () => {
    const err = {
      message: "Account quota exceeded: maximum 500 wardrobe_items allowed per account.",
    }
    expect(formatErrorMessage(err)).toMatch(/wardrobe full/i)
    expect(formatErrorMessage(err)).toMatch(/500/)
  })

  it("translates comment rate limit errors", () => {
    const err = {
      message: "Rate limit exceeded for comment_create: maximum 30 requests per 600 seconds.",
    }
    expect(formatErrorMessage(err)).toContain("Comment rate limit")
  })

  it("translates comment quota errors", () => {
    const err = {
      message: "Account quota exceeded: maximum 2000 garment_comments allowed per account.",
    }
    expect(formatErrorMessage(err)).toMatch(/comment limit/i)
  })
})
