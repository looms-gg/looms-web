import { describe, expect, it } from "vitest"
import { isAdmin, ADMIN_USER_IDS } from "./admin"

describe("admin authorization helper", () => {
  it("recognizes the designated admin user id", () => {
    expect(isAdmin("45e6be54-c9a5-4627-af39-9c14b27ec92e")).toBe(true)
    expect(isAdmin("45E6BE54-C9A5-4627-AF39-9C14B27EC92E")).toBe(true)
    expect(isAdmin("  45e6be54-c9a5-4627-af39-9c14b27ec92e  ")).toBe(true)
  })

  it("rejects non-admin users, null, and empty strings", () => {
    expect(isAdmin(null)).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
    expect(isAdmin("")).toBe(false)
    expect(isAdmin("00000000-0000-0000-0000-000000000000")).toBe(false)
    expect(isAdmin("random-user-id")).toBe(false)
  })

  it("contains the expected admin id in ADMIN_USER_IDS set", () => {
    expect(ADMIN_USER_IDS.has("45e6be54-c9a5-4627-af39-9c14b27ec92e")).toBe(true)
  })
})
