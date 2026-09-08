import { describe, expect, it } from "vitest"
import { absoluteAppUrl, routerBasename } from "./basePath"

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

describe("absoluteAppUrl", () => {
  it("appends the base path to the origin for Pages deploys", () => {
    expect(absoluteAppUrl("https://looms-gg.github.io", "/looms-web/")).toBe(
      "https://looms-gg.github.io/looms-web",
    )
  })

  it("returns the bare origin when base is root", () => {
    expect(absoluteAppUrl("https://looms.gg", "/")).toBe("https://looms.gg")
  })
})
