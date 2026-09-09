import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import * as authModule from "../state/auth"
import type { AuthContextValue } from "../state/auth"
import { AdminPage } from "./AdminPage"
import * as reportsApi from "../lib/reports"
import * as bannerApi from "../lib/siteBanner"
import * as adminAuditApi from "../lib/adminAudit"

function stubAuth(userId: string): AuthContextValue {
  return {
    user: { id: userId, email: "admin@looms.dev" } as AuthContextValue["user"],
    session: {} as AuthContextValue["session"],
    profile: { id: userId, username: "Admin" } as AuthContextValue["profile"],
    avatarUrl: null,
    loading: false,
    emailVerified: true,
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: vi.fn(),
    dismissEmailVerify: vi.fn(),
    resendConfirmation: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
    profileError: null,
    dismissProfileError: vi.fn(),
  }
}

async function renderAdminPage(userId = "45e6be54-c9a5-4627-af39-9c14b27ec92e") {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(
        <MemoryRouter>
          <authModule.AuthContext.Provider value={stubAuth(userId)}>
            <AdminPage />
          </authModule.AuthContext.Provider>
        </MemoryRouter>,
      )
    })
    await Promise.resolve()
  })
  return { host, root }
}

const cleanupList: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = []

afterEach(() => {
  for (const { root, host } of cleanupList.splice(0)) {
    flushSync(() => {
      root.unmount()
    })
    host.remove()
  }
  vi.restoreAllMocks()
})

describe("AdminPage", () => {
  beforeEach(() => {
    vi.spyOn(reportsApi, "fetchReports").mockResolvedValue([
      {
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
      },
    ])

    vi.spyOn(reportsApi, "fetchRecentPlatformActivity").mockResolvedValue({
      looks: [],
      pieces: [],
      comments: [],
      profiles: [],
    })

    vi.spyOn(bannerApi, "fetchAdminSiteBanner").mockResolvedValue({
      id: "b-1",
      is_active: true,
      text: "Current active announcement",
      link_url: null,
      link_label: null,
      style: "info",
      dismissible: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: null,
    })
  })

  it("renders header and moderation queue tab by default", async () => {
    const { host, root } = await renderAdminPage()
    cleanupList.push({ host, root })

    expect(host.textContent).toMatch(/Admin Panel/i)
    expect(host.textContent).toMatch(/Moderation Queue/i)
    expect(host.textContent).toMatch(/Toxic Creeper/i)
  })

  it("switches to Site Banner tab when clicked", async () => {
    const { host, root } = await renderAdminPage()
    cleanupList.push({ host, root })

    const bannerTabBtn = Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Site Banner"),
    )
    expect(bannerTabBtn).not.toBeUndefined()

    await act(async () => {
      bannerTabBtn?.click()
      await Promise.resolve()
    })

    expect(host.textContent).toMatch(/Site Announcement Active/i)
    expect(host.textContent).toMatch(/Current active announcement/i)
  })

  it("switches to Audit Log tab and renders entries", async () => {
    vi.spyOn(adminAuditApi, "fetchAdminAuditLog").mockResolvedValue([
      {
        id: "a-1",
        admin_id: "45e6be54",
        action: "delete_garment",
        target_table: "garments",
        target_id: "g-99",
        details: null,
        created_at: new Date().toISOString(),
      },
    ])
    const { host, root } = await renderAdminPage()
    cleanupList.push({ host, root })

    const auditTabBtn = Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Audit Log"),
    )
    expect(auditTabBtn).not.toBeUndefined()

    await act(async () => {
      auditTabBtn?.click()
      await Promise.resolve()
    })

    expect(host.textContent).toMatch(/delete garment/i)
    expect(host.textContent).toMatch(/garments/)
  })

  it("switches to Latest Activity tab when clicked", async () => {
    const { host, root } = await renderAdminPage()
    cleanupList.push({ host, root })

    const activityTabBtn = Array.from(host.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Latest Activity"),
    )
    expect(activityTabBtn).not.toBeUndefined()

    await act(async () => {
      activityTabBtn?.click()
      await Promise.resolve()
    })

    expect(host.textContent).toMatch(/Refresh/i)
  })
})
