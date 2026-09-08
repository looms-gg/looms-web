import { describe, expect, it } from "vitest"
import { nestComments, type GarmentComment } from "./comments"

function comment(partial: Partial<GarmentComment> & Pick<GarmentComment, "id">): GarmentComment {
  return {
    garmentId: "g1",
    userId: "u1",
    parentId: null,
    body: "hi",
    createdAt: 1,
    updatedAt: 1,
    username: "maker",
    ...partial,
  }
}

describe("nestComments", () => {
  it("groups one-level replies under roots", () => {
    const nested = nestComments([
      comment({ id: "root-2", createdAt: 2, body: "second" }),
      comment({ id: "root-1", createdAt: 1, body: "first" }),
      comment({ id: "r1", parentId: "root-1", createdAt: 3, body: "reply" }),
      comment({ id: "r2", parentId: "root-1", createdAt: 4, body: "later" }),
    ])

    expect(nested.map((t) => t.id)).toEqual(["root-2", "root-1"])
    expect(nested[1].replies.map((r) => r.id)).toEqual(["r1", "r2"])
  })
})
