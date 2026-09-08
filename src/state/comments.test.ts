import { describe, expect, it } from "vitest"
import { nestComments, mapCommentRow, type CommentItem } from "./comments"

function comment(partial: Partial<CommentItem> & Pick<CommentItem, "id">): CommentItem {
  return {
    targetType: "garment",
    targetId: "g1",
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

describe("mapCommentRow", () => {
  it("correctly maps look comments with look_id", () => {
    const mapped = mapCommentRow("look", {
      id: "c-look-1",
      look_id: "look-xyz",
      user_id: "u-99",
      parent_id: null,
      body: "Stunning combo!",
      created_at: "2026-09-08T00:00:00Z",
      updated_at: "2026-09-08T00:00:00Z",
      profiles: { username: "SkinStylist" },
    })

    expect(mapped.id).toBe("c-look-1")
    expect(mapped.targetType).toBe("look")
    expect(mapped.targetId).toBe("look-xyz")
    expect(mapped.lookId).toBe("look-xyz")
    expect(mapped.username).toBe("SkinStylist")
    expect(mapped.body).toBe("Stunning combo!")
  })
})
