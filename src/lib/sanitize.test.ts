import { describe, it, expect } from "vitest"
import {
  MAX_LIMITS,
  sanitizeText,
  sanitizeUsername,
  sanitizeMinecraftUsername,
  sanitizeUrl,
  validateFileSize,
} from "./sanitize"

describe("MAX_LIMITS", () => {
  it("defines standard constraints for inputs and uploads", () => {
    expect(MAX_LIMITS.FILE_SIZE_BYTES).toBe(2 * 1024 * 1024)
    expect(MAX_LIMITS.PIECE_NAME).toBe(50)
    expect(MAX_LIMITS.PIECE_DESCRIPTION).toBe(500)
    expect(MAX_LIMITS.LOOK_NAME).toBe(50)
    expect(MAX_LIMITS.LOOK_DESCRIPTION).toBe(500)
    expect(MAX_LIMITS.USERNAME).toBe(30)
    expect(MAX_LIMITS.MINECRAFT_USERNAME).toBe(16)
    expect(MAX_LIMITS.BIO).toBe(300)
    expect(MAX_LIMITS.SEARCH_QUERY).toBe(80)
  })
})

describe("sanitizeText", () => {
  it("strips HTML tags and prevents script injection", () => {
    const malicious = `<script>alert('XSS')</script>Winter Coat<img src=x onerror="alert(1)">`
    expect(sanitizeText(malicious, 50)).toBe("Winter Coat")
  })

  it("strips iframe, style and other dangerous HTML entities", () => {
    const input = `<iframe src="javascript:alert(1)"></iframe>Sweater`
    expect(sanitizeText(input, 50)).toBe("Sweater")
  })

  it("strips Unicode bidi override characters that spoof text direction", () => {
    const input = "Normal\u202E\u202DText\u202C"
    expect(sanitizeText(input, 50)).toBe("NormalText")
  })

  it("strips zero-width and invisible control characters", () => {
    const input = "Skin\u200B\u0000\u001FName"
    expect(sanitizeText(input, 50)).toBe("SkinName")
  })

  it("preserves safe punctuation and normal text", () => {
    const input = "Cool Steve's Jacket! (Blue & Gold) #1"
    expect(sanitizeText(input, 50)).toBe("Cool Steve's Jacket! (Blue & Gold) #1")
  })

  it("truncates to maxLength and trims edge whitespace", () => {
    const input = "   " + "A".repeat(100) + "   "
    expect(sanitizeText(input, 10)).toBe("A".repeat(10))
  })

  it("allows newlines when multiline is permitted", () => {
    const input = "Line 1\nLine 2\r\nLine 3"
    expect(sanitizeText(input, 100, { multiline: true })).toBe("Line 1\nLine 2\nLine 3")
  })

  it("flattens newlines when multiline is false", () => {
    const input = "Line 1\nLine 2"
    expect(sanitizeText(input, 100, { multiline: false })).toBe("Line 1 Line 2")
  })
})

describe("sanitizeUsername", () => {
  it("allows alphanumeric characters, dashes, and underscores", () => {
    expect(sanitizeUsername("Steve_Pro-99")).toBe("Steve_Pro-99")
  })

  it("strips spaces, symbols, and HTML", () => {
    expect(sanitizeUsername("<b>Steve</b> @Home!")).toBe("SteveHome")
  })

  it("clamps to max length 30", () => {
    const long = "A".repeat(50)
    expect(sanitizeUsername(long).length).toBe(30)
  })
})

describe("sanitizeMinecraftUsername", () => {
  it("allows valid Java IGN characters", () => {
    expect(sanitizeMinecraftUsername("Dinnerbone")).toBe("Dinnerbone")
    expect(sanitizeMinecraftUsername("_Notch_")).toBe("_Notch_")
  })

  it("strips dashes, spaces, and invalid symbols", () => {
    expect(sanitizeMinecraftUsername("Steve-123 @Home")).toBe("Steve123Home")
  })

  it("clamps to 16 characters", () => {
    const long = "12345678901234567890"
    expect(sanitizeMinecraftUsername(long)).toBe("1234567890123456")
  })
})

describe("sanitizeUrl", () => {
  it("accepts valid https and http URLs", () => {
    expect(sanitizeUrl("https://minotar.net/helm/Steve/128.png")).toBe(
      "https://minotar.net/helm/Steve/128.png",
    )
    expect(sanitizeUrl("http://example.com/skin.png")).toBe("http://example.com/skin.png")
  })

  it("rejects javascript: and data: schemes that trigger XSS", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull()
    expect(sanitizeUrl("JAVASCRIPT:alert(1)")).toBeNull()
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull()
    expect(sanitizeUrl("vbscript:msgbox(1)")).toBeNull()
  })

  it("rejects invalid URLs", () => {
    expect(sanitizeUrl("not a url")).toBeNull()
    expect(sanitizeUrl("")).toBeNull()
    expect(sanitizeUrl(null)).toBeNull()
    expect(sanitizeUrl(undefined)).toBeNull()
  })
})

describe("validateFileSize", () => {
  it("accepts files within the size limit", () => {
    const file = new File(["a".repeat(1024)], "skin.png", { type: "image/png" })
    const result = validateFileSize(file, 2 * 1024 * 1024)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it("rejects files exceeding the size limit", () => {
    const file = new File(["a".repeat(3000)], "skin.png", { type: "image/png" })
    const result = validateFileSize(file, 2048)
    expect(result.valid).toBe(false)
    expect(result.error).toContain("exceeds the 2 KB limit")
  })
})
