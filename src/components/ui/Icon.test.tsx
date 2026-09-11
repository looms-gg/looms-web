import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Check, Pants } from "@phosphor-icons/react"
import React from "react"
import { Icon } from "./Icon"

function render(el: React.ReactElement): SVGSVGElement {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(el)
  })
  return host.querySelector("svg")!
}

const pathOf = (markup: string) =>
  markup.match(/<path d="([^"]+)"/)?.[1] ?? ""

describe("Icon", () => {
  it("renders an svg icon", () => {
    expect(render(<Icon icon={Pants} />)).not.toBeNull()
  })

  it("renders solid (fill) weight by default", () => {
    expect(
      pathOf(renderToStaticMarkup(<Icon icon={Pants} />)),
    ).toBe(pathOf(renderToStaticMarkup(<Pants weight="fill" aria-hidden />)))
  })

  it("renders bare glyphs (check/x/plus/link) as bold, not boxed fill", () => {
    const checkPath = pathOf(renderToStaticMarkup(<Icon icon={Check} />))
    const fillPath = pathOf(renderToStaticMarkup(<Check weight="fill" aria-hidden />))
    const boldPath = pathOf(renderToStaticMarkup(<Check weight="bold" aria-hidden />))
    expect(checkPath).toBe(boldPath)
    expect(checkPath).not.toBe(fillPath)
  })

  it("maps named sizes to the size scale", () => {
    const cases = [
      ["xs", "size-3"],
      ["sm", "size-3.5"],
      ["md", "size-4"],
      ["lg", "size-6"],
      ["xl", "size-8"],
    ] as const
    for (const [size, cls] of cases) {
      expect(render(<Icon icon={Pants} size={size} />).getAttribute("class"))
        .toContain(cls)
    }
  })

  it("defaults to sm", () => {
    expect(render(<Icon icon={Pants} />).getAttribute("class"))
      .toContain("size-3.5")
  })
})
