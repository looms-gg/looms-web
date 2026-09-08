import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { GemMark } from "./GemMark"

describe("GemMark", () => {
  it("renders a decorative diamond", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<GemMark />)
    })
    expect(host.querySelector("[aria-hidden]")).not.toBeNull()
  })
})
