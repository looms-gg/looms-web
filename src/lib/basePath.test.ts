import { describe, expect, it } from "vitest"
import { routerBasename } from "./basePath"

describe("routerBasename", () => {
  it("strips trailing slash from Vite BASE_URL", () => {
    expect(routerBasename("/looms-web/")).toBe("/looms-web")
  })

  it("maps root base to empty basename (React Router default)", () => {
    expect(routerBasename("/")).toBe("")
  })

  it("keeps path without trailing slash", () => {
    expect(routerBasename("/looms-web")).toBe("/looms-web")
  })
})
