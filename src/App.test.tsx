import { describe, expect, it } from "vitest"
import App from "./App"

describe("App", () => {
  it("exports a root component", () => {
    expect(typeof App).toBe("function")
  })
})
