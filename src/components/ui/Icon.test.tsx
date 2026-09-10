import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { Pants } from "@phosphor-icons/react"
import { Icon } from "./Icon"

describe("Icon", () => {
  it("renders an svg icon", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<Icon icon={Pants} />)
    })
    expect(host.querySelector("svg")).not.toBeNull()
  })
})
