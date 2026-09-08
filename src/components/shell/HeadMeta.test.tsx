import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { HeadMeta } from "./HeadMeta"

afterEach(() => {
  document.head.innerHTML = ""
  document.body.innerHTML = ""
  document.title = ""
})

describe("HeadMeta", () => {
  it("updates document.title and Open Graph meta tags", async () => {
    const host = document.createElement("div")
    document.body.appendChild(host)

    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <HeadMeta
            title="Ink Fall"
            description="A warm woolen sweater"
            image="https://looms-gg.github.io/og/pieces/ink-fall.png"
            url="https://looms-gg.github.io/piece/ink-fall"
          />,
        )
      })
      await Promise.resolve()
    })

    expect(document.title).toBe("Ink Fall — looms")

    const ogTitle = document.querySelector('meta[property="og:title"]')
    expect(ogTitle?.getAttribute("content")).toBe("Ink Fall")

    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    expect(twitterTitle?.getAttribute("content")).toBe("Ink Fall")

    const ogDesc = document.querySelector('meta[property="og:description"]')
    expect(ogDesc?.getAttribute("content")).toBe("A warm woolen sweater")

    const ogImg = document.querySelector('meta[property="og:image"]')
    expect(ogImg?.getAttribute("content")).toBe("https://looms-gg.github.io/og/pieces/ink-fall.png")

    const ogUrl = document.querySelector('meta[property="og:url"]')
    expect(ogUrl?.getAttribute("content")).toBe("https://looms-gg.github.io/piece/ink-fall")
  })

  it("does not duplicate looms in document.title if already included", async () => {
    const host = document.createElement("div")
    document.body.appendChild(host)

    await act(async () => {
      flushSync(() => {
        createRoot(host).render(<HeadMeta title="looms — Minecraft clothing" />)
      })
      await Promise.resolve()
    })

    expect(document.title).toBe("looms — Minecraft clothing")
  })
})
