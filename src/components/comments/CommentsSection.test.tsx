import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CommentsSection } from "./CommentsSection"
import { mockSupabaseFrom, type SupabaseMockController } from "../../test/supabaseMock"
import { AuthContext } from "../../state/auth"
import type { AuthContextValue } from "../../state/auth"
import { makeAuthStub } from "../../test/authStub"

type CommentRow = {
  id: string
  garment_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
  profiles: unknown
}

function makeRow(overrides: Partial<CommentRow> = {}): CommentRow {
  return {
    id: "c-1",
    garment_id: "g-1",
    user_id: "u-1",
    parent_id: null,
    body: "First comment",
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
    profiles: { username: "CapeMaker" },
    ...overrides,
  }
}

const cleanupList: { root: Root; host: HTMLElement }[] = []

let selectResult: { data: CommentRow[] | null; error: { message: string } | null }
let singleResult: { data: CommentRow | null; error: { message: string } | null }
let insertPayload: Record<string, unknown> | undefined
let updatePayload: Record<string, unknown> | undefined
let eqCalls: Array<[string, unknown]>

function mockCommentsTable(): SupabaseMockController {
  const controller = mockSupabaseFrom()
  controller.setDefaultHandler((query) => {
    throw new Error(`unexpected table in test: ${query.table}`)
  })
  controller.on("garment_comments", (query) => {
    const payload = query.payload as { values?: Record<string, unknown> } | undefined
    const eqTuples = query.filters.map(
      (filter) => [filter.args[0] as string, filter.args[1]] as [string, unknown],
    )
    if (query.operation === "insert") {
      insertPayload = payload?.values
    } else if (query.operation === "update") {
      updatePayload = payload?.values
      eqCalls.push(...eqTuples)
    } else if (query.operation === "select") {
      eqCalls.push(...eqTuples)
    }
    if (query.isSingle) return singleResult
    return selectResult
  })
  return controller
}

async function renderComments(auth: AuthContextValue) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(
        <AuthContext.Provider value={auth}>
          <MemoryRouter>
            <CommentsSection targetType="garment" targetId="g-1" ownerId="u-owner" />
          </MemoryRouter>
        </AuthContext.Provider>,
      )
    })
    await new Promise((r) => setTimeout(r, 0))
  })
  cleanupList.push({ root, host })
  return host
}

async function clickButton(_host: HTMLElement, button: HTMLButtonElement) {
  await act(async () => {
    button.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

function findButtonByText(host: HTMLElement, label: string) {
  return Array.from(host.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(label),
  )
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function stubUser(id: string) {
  return makeAuthStub({
    user: { id, email: "test@looms.dev" } as AuthContextValue["user"],
  })
}

describe("CommentsSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    selectResult = { data: [], error: null }
    singleResult = { data: null, error: null }
    insertPayload = undefined
    updatePayload = undefined
    eqCalls = []
    mockCommentsTable()
  })

  afterEach(() => {
    for (const { root, host } of cleanupList.splice(0)) {
      flushSync(() => {
        root.unmount()
      })
      host.remove()
    }
    vi.restoreAllMocks()
  })

  it("renders nested replies under their parent thread", async () => {
    selectResult = {
      data: [
        makeRow(),
        makeRow({
          id: "c-2",
          body: "Second thread",
          user_id: "u-2",
          profiles: { username: "OtherMaker" },
        }),
        makeRow({
          id: "c-3",
          parent_id: "c-1",
          body: "Nice cape!",
          user_id: "u-3",
          profiles: { username: "ReplyMaker" },
        }),
      ],
      error: null,
    }

    const host = await renderComments(makeAuthStub())

    expect(host.textContent).toContain("Comments")
    expect(host.textContent).toContain("First comment")
    expect(host.textContent).toContain("Second thread")
    expect(host.textContent).toContain("Nice cape!")
    const replyArticle = Array.from(host.querySelectorAll("article")).find((a) =>
      a.className.includes("ml-6"),
    )
    expect(replyArticle?.textContent).toContain("Nice cape!")
    expect(replyArticle?.textContent).toContain("ReplyMaker")
  })

  it("posts a comment with sanitized body and shows it after reload", async () => {
    selectResult = { data: [makeRow()], error: null }
    const host = await renderComments(stubUser("u-1"))

    const textarea = host.querySelector<HTMLTextAreaElement>(
      "textarea[placeholder='Add a comment']",
    )
    expect(textarea).not.toBeNull()
    setInputValue(textarea!, "  <b>spooky</b> cape  ")
    singleResult = {
      data: makeRow({
        id: "c-9",
        user_id: "u-1",
        body: "spooky cape",
        created_at: "2026-09-02T10:00:00Z",
      }),
      error: null,
    }
    selectResult = {
      data: [
        makeRow(),
        makeRow({
          id: "c-9",
          user_id: "u-1",
          body: "spooky cape",
          created_at: "2026-09-02T10:00:00Z",
        }),
      ],
      error: null,
    }
    await clickButton(host, findButtonByText(host, "Post")!)

    expect(insertPayload).toEqual({
      garment_id: "g-1",
      user_id: "u-1",
      parent_id: null,
      body: "spooky cape",
    })
    expect(host.textContent).toContain("spooky cape")
    expect(textarea!.value).toBe("")
  })

  it("replying to a comment targets the parent comment id", async () => {
    selectResult = { data: [makeRow()], error: null }
    const host = await renderComments(stubUser("u-1"))

    await clickButton(host, findButtonByText(host, "Reply")!)

    const replyTextarea = host.querySelector<HTMLTextAreaElement>(
      "textarea[placeholder='Write a reply']",
    )
    expect(replyTextarea).not.toBeNull()
    setInputValue(replyTextarea!, "reply body")
    singleResult = {
      data: makeRow({
        id: "c-4",
        parent_id: "c-1",
        user_id: "u-1",
        body: "reply body",
        created_at: "2026-09-02T10:00:00Z",
      }),
      error: null,
    }
    const submit = Array.from(host.querySelectorAll("button")).find(
      (b) => b.type === "submit" && b.textContent?.includes("Reply"),
    )
    expect(submit).not.toBeUndefined()
    await clickButton(host, submit!)

    expect(insertPayload).toEqual({
      garment_id: "g-1",
      user_id: "u-1",
      parent_id: "c-1",
      body: "reply body",
    })
    expect(
      host.querySelector("textarea[placeholder='Write a reply']"),
    ).toBeNull()
  })

  it("editing own comment updates the body and refreshes the thread", async () => {
    selectResult = { data: [makeRow({ user_id: "u-1" })], error: null }
    const host = await renderComments(stubUser("u-1"))

    const editButton = findButtonByText(host, "Edit")
    expect(editButton).not.toBeUndefined()
    await clickButton(host, editButton!)

    const editTextarea = host.querySelector<HTMLTextAreaElement>(
      "textarea[placeholder='Edit your comment']",
    )
    expect(editTextarea).not.toBeNull()
    expect(editTextarea!.value).toBe("First comment")
    setInputValue(editTextarea!, "First comment edited")
    singleResult = {
      data: makeRow({
        user_id: "u-1",
        body: "First comment edited",
        updated_at: "2026-09-02T10:00:00Z",
      }),
      error: null,
    }
    selectResult = {
      data: [
        makeRow({
          user_id: "u-1",
          body: "First comment edited",
          updated_at: "2026-09-02T10:00:00Z",
        }),
      ],
      error: null,
    }
    await clickButton(host, findButtonByText(host, "Save")!)

    expect(updatePayload).toEqual({ body: "First comment edited" })
    expect(eqCalls).toContainEqual(["id", "c-1"])
    expect(eqCalls).toContainEqual(["user_id", "u-1"])
    expect(host.querySelector("textarea[placeholder='Edit your comment']")).toBeNull()
    expect(host.textContent).toContain("First comment edited")
  })

  it("renders only rows the server returns, falling back to maker when the author profile is gone", async () => {
    selectResult = {
      data: [
        makeRow({ profiles: null }),
        makeRow({ id: "c-2", user_id: "u-2", body: "Survived moderation" }),
      ],
      error: null,
    }

    const host = await renderComments(makeAuthStub())

    expect(host.textContent).toContain("First comment")
    expect(host.textContent).toContain("Survived moderation")
    expect(host.textContent).toContain("maker")
    expect(host.querySelectorAll("article")).toHaveLength(2)
  })

  it("shows a friendly error on insert failure and keeps the thread intact", async () => {
    selectResult = { data: [makeRow()], error: null }
    const host = await renderComments(stubUser("u-1"))

    const textarea = host.querySelector<HTMLTextAreaElement>(
      "textarea[placeholder='Add a comment']",
    )
    expect(textarea).not.toBeNull()
    setInputValue(textarea!, "never posted")
    singleResult = {
      data: null,
      error: {
        message: "new row violates row-level security policy for table garment_comments",
      },
    }
    await clickButton(host, findButtonByText(host, "Post")!)

    const alert = host.querySelector("[role='alert']")
    expect(alert?.textContent).toContain("An unexpected error occurred")
    expect(host.textContent).not.toContain("row-level security")
    expect(host.textContent).not.toContain("never posted")
    expect(host.textContent).toContain("First comment")
    expect(host.querySelectorAll("article")).toHaveLength(1)
  })
})
