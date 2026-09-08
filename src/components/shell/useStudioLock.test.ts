import { describe, expect, it } from "vitest"
import { setStudioLock } from "./useStudioLock"

describe("setStudioLock", () => {
  it("toggles the studio-lock class on the document", () => {
    setStudioLock(true)
    expect(document.documentElement.classList.contains("studio-lock")).toBe(true)
    setStudioLock(false)
    expect(document.documentElement.classList.contains("studio-lock")).toBe(false)
  })
})
