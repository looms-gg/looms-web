import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BlogContent, buildTokenKeys, tokenizeMarkdown } from "./BlogContent"

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

describe("BlogContent component", () => {
  it("tokenizes markdown headings, paragraphs, and lists", () => {
    const markdown = `
## Main Title

This is a paragraph with **bold** text and *italic* text.

- Item 1
- Item 2

1. First
2. Second

---

> Important notice!
`
    const tokens = tokenizeMarkdown(markdown)
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "h2", text: "Main Title" }),
        expect.objectContaining({
          type: "paragraph",
          text: "This is a paragraph with **bold** text and *italic* text.",
        }),
        expect.objectContaining({
          type: "bullet_list",
          items: ["Item 1", "Item 2"],
        }),
        expect.objectContaining({
          type: "ordered_list",
          items: ["First", "Second"],
        }),
        expect.objectContaining({ type: "hr" }),
        expect.objectContaining({
          type: "blockquote",
          lines: ["Important notice!"],
        }),
      ]),
    )
  })

  it("renders external images with caption and middle alignment", async () => {
    const content = `
![Cosmetic Showcase](https://example.com/cosmetics.png)
`
    const host = await renderAsync(<BlogContent content={content} />)

    const img = host.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("src")).toBe("https://example.com/cosmetics.png")
    expect(img?.getAttribute("alt")).toBe("Cosmetic Showcase")
    expect(host.textContent).toContain("Cosmetic Showcase")
  })

  it("rejects insecure or javascript URLs in images", async () => {
    const content = `
![Exploit](javascript:alert(1))
`
    const host = await renderAsync(<BlogContent content={content} />)
    expect(host.querySelector("img")).toBeNull()
  })

  it("renders blockquote callout card", async () => {
    const content = `
> Remember to check your wardrobe!
`
    const host = await renderAsync(<BlogContent content={content} />)
    expect(host.textContent).toContain("Remember to check your wardrobe!")
  })

  it("renders inline links with target blank and safe rel", async () => {
    const content = `
Check out the [Studio](https://looms.gg/studio) now.
`
    const host = await renderAsync(<BlogContent content={content} />)
    const link = host.querySelector("a")
    expect(link).not.toBeNull()
    expect(link?.textContent).toBe("Studio")
    expect(link?.getAttribute("href")).toBe("https://looms.gg/studio")
  })

  it("renders code blocks", async () => {
    const content = `
\`\`\`ts
const model = "classic";
\`\`\`
`
    const host = await renderAsync(<BlogContent content={content} />)
    expect(host.textContent).toContain('const model = "classic";')
  })
})

describe("buildTokenKeys", () => {
  it("gives unchanged tokens the same key when earlier content is edited", () => {
    const before = tokenizeMarkdown(
      "First paragraph.\n\n![Pic](https://i.imgur.com/a.png)\n\n## Heading\n\nSecond paragraph.\n",
    )
    const after = tokenizeMarkdown(
      "Edited first paragraph.\n\n![Pic](https://i.imgur.com/a.png)\n\n## Heading\n\nSecond paragraph.\n",
    )
    const keysBefore = buildTokenKeys(before)
    const keysAfter = buildTokenKeys(after)
    expect(keysAfter[1]).toBe(keysBefore[1])
    expect(keysAfter[2]).toBe(keysBefore[2])
    expect(keysAfter[3]).toBe(keysBefore[3])
  })

  it("still produces unique keys for repeated identical tokens", () => {
    const tokens = tokenizeMarkdown(
      "Same paragraph.\n\nSame paragraph.\n\n## Heading\n\nSame paragraph.\n",
    )
    const keys = buildTokenKeys(tokens)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

