import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { UsernameStep } from "./UsernameStep"

function mountStep(overrides: Partial<Parameters<typeof UsernameStep>[0]> = {}) {
  const onSubmit = vi.fn()
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <UsernameStep
        title="Pick a username"
        subtitle="This is how you appear across looms."
        submitLabel="Continue"
        busy={false}
        error={null}
        onSubmit={onSubmit}
        {...overrides}
      />,
    )
  })
  return { host, onSubmit }
}

function submit(host: HTMLElement) {
  host
    .querySelector("form")!
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))
}

describe("UsernameStep", () => {
  it("renders the prefilled username", () => {
    const { host } = mountStep({ initialUsername: "PixelWeaver" })
    const input = host.querySelector<HTMLInputElement>("input")
    expect(input?.value).toBe("PixelWeaver")
  })

  it("submits the sanitized username", () => {
    const { host, onSubmit } = mountStep({ initialUsername: "Pixel <b>Weaver</b>" })
    submit(host)
    expect(onSubmit).toHaveBeenCalledWith("PixelWeaver")
  })

  it("does not submit when the field is empty", () => {
    const { host, onSubmit } = mountStep({ initialUsername: "" })
    submit(host)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows the passed error and disables the button while busy", () => {
    const { host } = mountStep({ error: "That username is taken. Try another.", busy: true })
    expect(host.textContent).toContain("That username is taken. Try another.")
    const button = host.querySelector<HTMLButtonElement>("button[type=submit]")!
    expect(button.disabled).toBe(true)
  })
})
