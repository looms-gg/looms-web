import { beforeEach, describe, expect, it, vi } from "vitest"

const uploadMock = vi.fn()
const getPublicUrlMock = vi.fn()

vi.mock("../../lib/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => uploadMock(...args),
        getPublicUrl: (...args: unknown[]) => getPublicUrlMock(...args),
      }),
    },
  },
}))

vi.mock("./compressProfileImage", async () => {
  const actual = await vi.importActual<typeof import("./compressProfileImage")>(
    "./compressProfileImage",
  )
  return {
    ...actual,
    compressProfileImage: vi.fn(async (_file: File, kind: "avatar" | "banner") => {
      return new File([new Uint8Array([1, 2, 3])], `${kind}.webp`, { type: "image/webp" })
    }),
  }
})

import { compressProfileImage } from "./compressProfileImage"
import { uploadProfileImage } from "./uploadProfileImage"

describe("uploadProfileImage", () => {
  beforeEach(() => {
    uploadMock.mockReset()
    getPublicUrlMock.mockReset()
    vi.mocked(compressProfileImage).mockClear()
    uploadMock.mockResolvedValue({ error: null })
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: "https://example.test/profiles/u1/avatar.webp" },
    })
  })

  it("compresses then uploads a webp under the user folder", async () => {
    const raw = new File([new Uint8Array(1200)], "photo.png", { type: "image/png" })
    const url = await uploadProfileImage("u1", "avatar", raw)

    expect(compressProfileImage).toHaveBeenCalledWith(raw, "avatar")
    expect(uploadMock).toHaveBeenCalled()
    const [path, file, opts] = uploadMock.mock.calls[0]
    expect(path).toMatch(/^u1\/avatar-\d+\.webp$/)
    expect(file).toBeInstanceOf(File)
    expect((file as File).type).toBe("image/webp")
    expect(opts).toMatchObject({ contentType: "image/webp", upsert: true })
    expect(url).toBe("https://example.test/profiles/u1/avatar.webp")
  })

  it("rejects disallowed types before compress", async () => {
    const gif = new File([new Uint8Array(10)], "x.gif", { type: "image/gif" })
    await expect(uploadProfileImage("u1", "banner", gif)).rejects.toThrow(/Invalid file type/i)
    expect(compressProfileImage).not.toHaveBeenCalled()
    expect(uploadMock).not.toHaveBeenCalled()
  })
})
