import { describe, expect, it } from "vitest"
import { likeKey, parseLikeKey } from "./likeKey"

describe("likeKey", () => {
  it("round-trips", () => {
    const key = likeKey("garment", "abc")
    expect(key).toBe("garment:abc")
    expect(parseLikeKey(key)).toEqual({ type: "garment", id: "abc" })
  })

  it("rejects bad keys", () => {
    expect(parseLikeKey("nope")).toBeNull()
    expect(parseLikeKey("hat:xyz")).toBeNull()
  })
})
