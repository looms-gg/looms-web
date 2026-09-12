import { describe, expect, it } from "vitest"
import { absoluteAppUrl, recoveryRedirectPath, routerBasename } from "./basePath"

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

describe("recoveryRedirectPath", () => {
  const recoveryHash =
    "#access_token=abc&refresh_token=def&token_type=bearer&type=recovery"

  it("maps a recovery hash dropped at the root to the reset page, keeping the hash", () => {
    expect(recoveryRedirectPath(recoveryHash, "/")).toBe(`/reset-password${recoveryHash}`)
  })

  it("includes the base path on Pages deploys", () => {
    expect(recoveryRedirectPath(recoveryHash, "/looms-web/")).toBe(
      `/looms-web/reset-password${recoveryHash}`,
    )
  })

  it("returns null for non-recovery hashes", () => {
    expect(recoveryRedirectPath("#access_token=abc&type=signup", "/")).toBeNull()
    expect(recoveryRedirectPath("", "/")).toBeNull()
  })
})
