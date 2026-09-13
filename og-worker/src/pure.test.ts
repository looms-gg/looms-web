import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import satori from "satori"
import {
  OG_COLORS,
  OG_HEIGHT,
  OG_WIDTH,
  cardElement,
  fallbackResponse,
  parseOgPath,
  sanitizeText,
  slotLabel,
  truncate,
} from "./pure"

describe("og-worker pure helpers", () => {
  describe("parseOgPath", () => {
    it("parses valid piece paths", () => {
      expect(parseOgPath("/og/piece/cap-1.png")).toEqual({
        kind: "piece",
        id: "cap-1",
      })
      expect(parseOgPath("/og/piece/garment_42-v2.png")).toEqual({
        kind: "piece",
        id: "garment_42-v2",
      })
    })

    it("parses valid look paths", () => {
      expect(parseOgPath("/og/look/look-abc.png")).toEqual({
        kind: "look",
        id: "look-abc",
      })
    })

    it("parses the default fallback path", () => {
      expect(parseOgPath("/og/default.png")).toEqual({ kind: "default" })
    })

    it("returns not-found for invalid or malformed routes", () => {
      expect(parseOgPath("/")).toEqual({ kind: "not-found" })
      expect(parseOgPath("/og/piece/")).toEqual({ kind: "not-found" })
      expect(parseOgPath("/og/piece/nested/path.png")).toEqual({ kind: "not-found" })
      expect(parseOgPath("/og/unknown/xyz.png")).toEqual({ kind: "not-found" })
      expect(parseOgPath("/og/piece/foo.jpg")).toEqual({ kind: "not-found" })
      expect(parseOgPath("/og/piece/invalid@id.png")).toEqual({ kind: "not-found" })
    })
  })

  describe("slotLabel", () => {
    it("returns display labels for recognized slots", () => {
      expect(slotLabel("eyes")).toBe("EYES")
      expect(slotLabel("hair")).toBe("HAIR")
      expect(slotLabel("hat")).toBe("HEADWEAR")
      expect(slotLabel("face")).toBe("FACE ACCESSORY")
      expect(slotLabel("shirt")).toBe("SHIRT & TOP")
      expect(slotLabel("coat")).toBe("OUTERWEAR")
      expect(slotLabel("pants")).toBe("BOTTOMS")
      expect(slotLabel("shoes")).toBe("FOOTWEAR")
      expect(slotLabel("set")).toBe("OUTFIT SET")
    })

    it("uppercases unrecognized slots as fallback", () => {
      expect(slotLabel("gloves")).toBe("GLOVES")
      expect(slotLabel("cape")).toBe("CAPE")
    })
  })

  describe("sanitizeText", () => {
    it("strips HTML tags and control characters", () => {
      const sanitized = sanitizeText("<script>alert(1)</script><b>Beanie</b>\u0000\u200B", 50)
      expect(sanitized).toBe("alert(1)Beanie")
    })

    it("clamps string to maxLength", () => {
      expect(sanitizeText("A very long description that should get trimmed", 10)).toBe(
        "A very lon",
      )
    })

    it("handles null and undefined safely", () => {
      expect(sanitizeText(null, 50)).toBe("")
      expect(sanitizeText(undefined, 50)).toBe("")
    })
  })

  describe("truncate", () => {
    it("keeps strings within limits untouched", () => {
      expect(truncate("Short title", 20)).toBe("Short title")
      expect(truncate("Exact length", 12)).toBe("Exact length")
    })

    it("appends ellipsis when string exceeds limit", () => {
      expect(truncate("A longer title exceeding limit", 10)).toBe("A longer t…")
    })
  })

  describe("cardElement", () => {
    it("constructs an element tree with design tokens and given options", () => {
      const element = cardElement({
        title: "Test Beanie",
        subtitle: "by Tester",
        creatorIsCyan: true,
        badge: "HEADWEAR",
        badge2: "12 SAVES",
        description: "A warm knit beanie for cold days in Minecraft.",
        footer: "looms.gg",
        wash: "hsl(200 40% 50%)",
        imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      })

      expect(element.type).toBe("div")
      expect(element.props.style.width).toBe(`${OG_WIDTH}px`)
      expect(element.props.style.height).toBe(`${OG_HEIGHT}px`)
      expect(element.props.style.background).toBe(OG_COLORS.VOID)
      expect(element.props.children).toHaveLength(4) // 2 wash discs, left column, right stage tile
    })

    it("works without badge2 or imageUrl", () => {
      const element = cardElement({
        title: "Simple Outfit",
        subtitle: "3 layers · Community Look",
        creatorIsCyan: false,
        badge: "OUTFIT",
        description: "Layered outfit description.",
        footer: "looms.gg",
        wash: "hsl(320 35% 55%)",
      })

      expect(element.type).toBe("div")
      expect(element.props.children[3].props.children).toHaveLength(0)
    })
  })

  describe("satori SVG rendering stage", () => {
    const boldFontPath = resolve(__dirname, "../assets/Nunito-ExtraBold.ttf")
    const semiBoldFontPath = resolve(__dirname, "../assets/Nunito-SemiBold.ttf")
    const boldFontData = readFileSync(boldFontPath).buffer
    const semiBoldFontData = readFileSync(semiBoldFontPath).buffer

    it("renders cardElement into valid SVG without throwing", async () => {
      const element = cardElement({
        title: "Winter Explorer",
        subtitle: "by Steve",
        creatorIsCyan: true,
        badge: "OUTERWEAR",
        badge2: "45 SAVES",
        description: "A cozy winter jacket styled with fine stitching.",
        footer: "looms.gg",
        wash: "hsl(210 50% 45%)",
      })

      const svg = await satori(element as Parameters<typeof satori>[0], {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: [
          { name: "Nunito", data: boldFontData, weight: 800, style: "normal" },
          { name: "Nunito", data: semiBoldFontData, weight: 400, style: "normal" },
        ],
      })

      expect(svg).toBeTypeOf("string")
      expect(svg).toContain("<svg")
      expect(svg).toContain(`width="${OG_WIDTH}"`)
      expect(svg).toContain(`height="${OG_HEIGHT}"`)
      expect(svg).toContain("radialGradient")
      expect(svg).toContain('fill="#121214"')
      expect(svg).toContain('fill="#1a1a1e"')
      expect(svg).toContain('stroke="#3e3e44"')
    })

    it("handles fallback default card rendering cleanly", async () => {
      const defaultElement = cardElement({
        title: "Winter Explorer",
        subtitle: "4 layers  ·  Curated Outfit",
        creatorIsCyan: false,
        badge: "OUTFIT",
        description: "Winter coat, converse shoes, dark sweatpants, and ink fall hair.",
        footer: "Free to style, export, and wear  ·  looms.gg",
        wash: "hsl(320 35% 55%)",
      })

      const svg = await satori(defaultElement as Parameters<typeof satori>[0], {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: [
          { name: "Nunito", data: boldFontData, weight: 800, style: "normal" },
          { name: "Nunito", data: semiBoldFontData, weight: 400, style: "normal" },
        ],
      })

      expect(svg).toBeTypeOf("string")
      expect(svg).toContain("<svg")
      expect(svg).toContain(`width="${OG_WIDTH}"`)
      expect(svg).toContain(`height="${OG_HEIGHT}"`)
      expect(svg).toContain("radialGradient")
    })
  })

  describe("fallbackResponse", () => {
    it("redirects bad or missing piece IDs to default.png with 302", () => {
      const response = fallbackResponse(
        { kind: "piece", id: "non-existent-piece" },
        "https://looms.gg",
      )
      expect(response.status).toBe(302)
      expect(response.headers.get("location")).toBe("https://looms.gg/og/default.png")
    })

    it("redirects bad or missing look IDs to default.png with 302", () => {
      const response = fallbackResponse(
        { kind: "look", id: "non-existent-look" },
        "https://looms.gg",
      )
      expect(response.status).toBe(302)
      expect(response.headers.get("location")).toBe("https://looms.gg/og/default.png")
    })

    it("returns 404 for not-found routes", () => {
      const response = fallbackResponse({ kind: "not-found" }, "https://looms.gg")
      expect(response.status).toBe(404)
    })

    it("safely handles arbitrary origins and IDs without throwing", () => {
      expect(() =>
        fallbackResponse({ kind: "piece", id: "../bad/traversal" }, "http://localhost:8787"),
      ).not.toThrow()
    })
  })
})

