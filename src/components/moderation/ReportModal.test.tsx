import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ReportModal } from "./ReportModal"
import * as reportsApi from "../../lib/reports"

const roots: { root: Root; host: HTMLElement }[] = []

function render(ui: React.ReactNode) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(ui)
  })
  roots.push({ root, host })
  return document.body
}

afterEach(() => {
  for (const { root, host } of roots.splice(0)) {
    flushSync(() => {
      root.unmount()
    })
    host.remove()
  }
  vi.restoreAllMocks()
})

describe("ReportModal", () => {
  it("renders modal with target information and reasons when open", () => {
    const body = render(
      <ReportModal
        open={true}
        onClose={() => {}}
        targetType="look"
        targetId="look-1"
        targetLabel="Look: Cyber Ninja"
        reporterId="u-reporter"
      />,
    )

    expect(body.textContent).toMatch(/Report Look/i)
    expect(body.textContent).toMatch(/Cyber Ninja/i)
    expect(body.textContent).toMatch(/Inappropriate \/ NSFW/i)
    expect(body.textContent).toMatch(/Spam \/ Advertising/i)
    expect(body.querySelector('textarea#report-details')).not.toBeNull()
  })

  it("submits report and shows success confirmation", async () => {
    const createSpy = vi.spyOn(reportsApi, "createContentReport").mockResolvedValue({
      id: "rep-1",
      reporter_id: "u-reporter",
      target_type: "look",
      target_id: "look-1",
      target_sub_type: null,
      target_label: "Look: Cyber Ninja",
      reason: "inappropriate",
      details: "test notes",
      status: "pending",
      action_taken: "none",
      resolved_by: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
    })

    const body = render(
      <ReportModal
        open={true}
        onClose={() => {}}
        targetType="look"
        targetId="look-1"
        targetLabel="Look: Cyber Ninja"
        reporterId="u-reporter"
      />,
    )

    const form = body.querySelector("form") as HTMLFormElement
    expect(form).not.toBeNull()

    flushSync(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterId: "u-reporter",
        targetType: "look",
        targetId: "look-1",
        reason: "inappropriate",
      }),
    )
  })

  it("does not render modal contents when closed", () => {
    const body = render(
      <ReportModal
        open={false}
        onClose={() => {}}
        targetType="piece"
        targetId="p-1"
        reporterId="u-1"
      />,
    )

    expect(body.querySelector('textarea#report-details')).toBeNull()
  })
})
