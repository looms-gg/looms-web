import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { faGem } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "./FaIcon"

describe("FaIcon", () => {
  it("renders an svg icon", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<FaIcon icon={faGem} />)
    })
    expect(host.querySelector("svg")).not.toBeNull()
  })
})
