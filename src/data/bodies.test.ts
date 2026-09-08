import { describe, expect, it } from "vitest"
import { DEFAULT_BODY_ID, bodyOrDefault, getBody } from "./bodies"

describe("bodies", () => {
  it("returns undefined for unknown ids", () => {
    expect(getBody("nope")).toBeUndefined()
    expect(getBody(undefined)).toBeUndefined()
  })

  it("falls back to the default body when asked", () => {
    expect(bodyOrDefault("nope").id).toBe(DEFAULT_BODY_ID)
    expect(bodyOrDefault(DEFAULT_BODY_ID).id).toBe(DEFAULT_BODY_ID)
  })
})
