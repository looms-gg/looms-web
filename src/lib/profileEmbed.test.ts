import { describe, expect, it } from "vitest"
import { coerceProfileEmbed } from "./profileEmbed"

describe("coerceProfileEmbed", () => {
  it("returns fallback for null, undefined, or empty values", () => {
    expect(coerceProfileEmbed(null)).toEqual({ username: "maker", avatar_url: null })
    expect(coerceProfileEmbed(undefined)).toEqual({ username: "maker", avatar_url: null })
    expect(coerceProfileEmbed([])).toEqual({ username: "maker", avatar_url: null })
    expect(coerceProfileEmbed("")).toEqual({ username: "maker", avatar_url: null })
    expect(coerceProfileEmbed(123)).toEqual({ username: "maker", avatar_url: null })
  })

  it("extracts username and avatar_url from single object", () => {
    expect(coerceProfileEmbed({ username: "alex", avatar_url: "https://example.com/a.png" })).toEqual({
      username: "alex",
      avatar_url: "https://example.com/a.png",
    })
  })

  it("extracts from single-element array", () => {
    expect(coerceProfileEmbed([{ username: "steve", avatar_url: null }])).toEqual({
      username: "steve",
      avatar_url: null,
    })
  })

  it("falls back to 'maker' when username is empty or non-string", () => {
    expect(coerceProfileEmbed({ username: "   ", avatar_url: "a.png" })).toEqual({
      username: "maker",
      avatar_url: "a.png",
    })
    expect(coerceProfileEmbed({ username: 42, avatar_url: "a.png" })).toEqual({
      username: "maker",
      avatar_url: "a.png",
    })
  })

  it("normalizes avatar_url to null when not a string", () => {
    expect(coerceProfileEmbed({ username: "alex", avatar_url: 123 })).toEqual({
      username: "alex",
      avatar_url: null,
    })
  })
})

