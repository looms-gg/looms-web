import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ModerationQueue } from "./ModerationQueue"
import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  type RpcMockController,
} from "../../test/supabaseMock"
import type { ContentReportRow } from "../../lib/reports"

function makeReport(overrides: Partial<ContentReportRow> = {}): ContentReportRow {
  return {
    id: "rep-1",
    reporter_id: "u-reporter",
    target_type: "look",
    target_id: "look-99",
    target_sub_type: null,
    target_label: "Look: Toxic Creeper",
    reason: "inappropriate",
    details: "offensive skin",
    status: "pending",
    action_taken: "none",
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

const cleanupList: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = []

let queueData: ContentReportRow[] = []
let pendingCount = 0
let rpcHandler: (fn: string) => { data: unknown; error: { message: string } | null }
let rpc: RpcMockController

async function renderQueue() {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(
        <MemoryRouter>
          <ModerationQueue />
        </MemoryRouter>,
      )
    })
    await new Promise((r) => setTimeout(r, 0))
  })
  cleanupList.push({ host, root })
  return host
}

async function clickButton(host: HTMLElement, label: string) {
  const btn = Array.from(host.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(label),
  )
  expect(btn).not.toBeUndefined()
  await act(async () => {
    btn?.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

function findButton(host: HTMLElement, label: string) {
  return Array.from(host.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(label),
  )
}

describe("ModerationQueue", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    queueData = [makeReport()]
    pendingCount = 1
    rpcHandler = () => ({ data: null, error: null })

    const from = mockSupabaseFrom()
    from.setDefaultHandler((query) => {
      throw new Error(`unexpected table in test: ${query.table}`)
    })
    from.on("content_reports", (query) => {
      const opts = query.payload as { options?: { head?: boolean } } | undefined
      if (opts?.options?.head) {
        return { data: null, count: pendingCount, error: null }
      }
      return { data: queueData, error: null }
    })

    rpc = mockSupabaseRpc()
    rpc.setDefaultHandler((call) => rpcHandler(call.fn))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const { root, host } of cleanupList.splice(0)) {
      flushSync(() => {
        root.unmount()
      })
      host.remove()
    }
  })

  it("renders pending reports with moderation action buttons", async () => {
    const host = await renderQueue()

    expect(host.textContent).toMatch(/Toxic Creeper/)
    expect(findButton(host, "Resolve")).not.toBeUndefined()
    expect(findButton(host, "Dismiss")).not.toBeUndefined()
    expect(findButton(host, "Hide Content")).not.toBeUndefined()
    expect(findButton(host, "Delete Content")).not.toBeUndefined()
  })

  it("resolving a report calls admin_resolve_report and the row leaves the pending queue", async () => {
    rpc.on("admin_resolve_report", () => {
      queueData = []
      return { data: null, error: null }
    })

    const host = await renderQueue()
    await clickButton(host, "Resolve")

    expect(rpc.rpcSpy).toHaveBeenCalledWith("admin_resolve_report", {
      p_report_id: "rep-1",
      p_status: "resolved",
      p_action_taken: "approved",
    })
    expect(host.textContent).toMatch(/All caught up/)
    expect(findButton(host, "Resolve")).toBeUndefined()
  })

  it("hiding content calls admin_set_moderation_state then resolves the report", async () => {
    rpc.on("admin_resolve_report", () => {
      queueData = []
      return { data: null, error: null }
    })

    const host = await renderQueue()
    await clickButton(host, "Hide Content")

    expect(rpc.rpcSpy).toHaveBeenCalledWith("admin_set_moderation_state", {
      p_target_type: "look",
      p_target_id: "look-99",
      p_state: "hidden",
      p_details: null,
    })
    expect(rpc.rpcSpy).toHaveBeenCalledWith("admin_resolve_report", {
      p_report_id: "rep-1",
      p_status: "resolved",
      p_action_taken: "content_hidden",
    })
    const calls = rpc.calls.map((call) => call.fn)
    expect(calls).toEqual(["admin_set_moderation_state", "admin_resolve_report"])
  })

  it("deleting content requires confirmation before any RPC fires", async () => {
    const confirmSpy = vi.fn().mockReturnValue(false)
    vi.stubGlobal("confirm", confirmSpy)

    const host = await renderQueue()
    await clickButton(host, "Delete Content")

    expect(confirmSpy).toHaveBeenCalledOnce()
    expect(rpc.rpcSpy).not.toHaveBeenCalled()
    expect(host.textContent).toMatch(/Toxic Creeper/)
  })

  it("confirmed delete calls admin_delete_content then resolves the report", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn().mockReturnValue(true),
    )
    rpc.on("admin_resolve_report", () => {
      queueData = []
      return { data: null, error: null }
    })

    const host = await renderQueue()
    await clickButton(host, "Delete Content")

    expect(rpc.rpcSpy).toHaveBeenCalledWith("admin_delete_content", {
      p_target_type: "look",
      p_target_id: "look-99",
      p_sub_type: null,
    })
    expect(rpc.rpcSpy).toHaveBeenCalledWith("admin_resolve_report", {
      p_report_id: "rep-1",
      p_status: "resolved",
      p_action_taken: "content_deleted",
    })
  })

  it("shows friendly error feedback when the RPC rejects and keeps the row in place", async () => {
    rpcHandler = () => ({
      data: null,
      error: { message: "caller is not an admin" },
    })

    const host = await renderQueue()
    await clickButton(host, "Resolve")

    const alert = host.querySelector("[role='alert']")
    expect(alert?.textContent).toContain("caller is not an admin")
    expect(findButton(host, "Resolve")).not.toBeUndefined()
    expect(host.textContent).toMatch(/Toxic Creeper/)
  })
})
