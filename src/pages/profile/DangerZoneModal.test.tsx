import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { supabase } from "../../lib/supabase"
import { DangerZoneModal } from "./DangerZoneModal"

describe("DangerZoneModal", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  }

  function renderModal(props?: Partial<{ busy: boolean }>) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const root = createRoot(host)
    const onDone = vi.fn()
    flushSync(() => {
      root.render(
        <DangerZoneModal
          open={true}
          busy={props?.busy ?? false}
          onClose={() => {}}
          onDone={onDone}
        />,
      )
    })
    return { host, root, onDone }
  }

  it("requires typing DELETE before enabling the confirm button", () => {
    const { host, root } = renderModal()
    const button = host.querySelector("button.btn-error") as HTMLButtonElement
    expect(button).not.toBeNull()
    expect(button.disabled).toBe(true)
    expect(host.textContent).toMatch(/type delete/i)
    root.unmount()
  })

  it("calls the RPC and onDone when confirmed", async () => {
    const rpc = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never)
    const { host, root, onDone } = renderModal()

    const input = host.querySelector("input") as HTMLInputElement
    await act(async () => {
      setInputValue(input, "delete")
      await Promise.resolve()
    })
    flushSync(() => {})

    const button = host.querySelector("button.btn-error") as HTMLButtonElement
    expect(button.disabled).toBe(false)

    await act(async () => {
      button.click()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledWith("delete_my_account")
    expect(onDone).toHaveBeenCalled()
    root.unmount()
  })

  it("keeps the modal and shows an error when the RPC fails", async () => {
    vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: null,
      error: { message: "delete_my_account: not authenticated" },
    } as never)
    const { host, root, onDone } = renderModal()

    const input = host.querySelector("input") as HTMLInputElement
    await act(async () => {
      setInputValue(input, "DELETE")
      await Promise.resolve()
    })
    flushSync(() => {})

    await act(async () => {
      ;(host.querySelector("button.btn-error") as HTMLButtonElement).click()
      await Promise.resolve()
    })

    expect(host.textContent).toMatch(/not authenticated/i)
    expect(onDone).not.toHaveBeenCalled()
    root.unmount()
  })
})
