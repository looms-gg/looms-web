import React from "react"
import { describe, it, expect } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { DesktopPartFilter } from "./DesktopPartFilter"
import type { EditorVisibilityState } from "./tools/useEditorVisibility"
import type { LimbId } from "./tools/editorControls"
import type { SkinEditorState } from "./useSkinEditor"

describe("DesktopPartFilter (MineSkin 1:1)", () => {
  it("renders Layer 1 and Layer 2 mannequins with toggle buttons", () => {
    let toggledBody: string | null = null
    let toggledArmor: string | null = null
    let allBodyToggled = false
    let allArmorToggled = false

    const fakeEditor: Partial<SkinEditorState> = {
      visibility: {
        data: {
          bodyParts: {
            head: true,
            body: true,
            rightArm: true,
            leftArm: true,
            rightLeg: true,
            leftLeg: true,
          },
          armorParts: {
            head: true,
            body: true,
            rightArm: true,
            leftArm: true,
            rightLeg: true,
            leftLeg: true,
          },
        },
        toggleBodyPart: (p: LimbId) => {
          toggledBody = p
        },
        toggleArmorPart: (p: LimbId) => {
          toggledArmor = p
        },
        toggleAllBody: () => {
          allBodyToggled = true
        },
        toggleAllArmor: () => {
          allArmorToggled = true
        },
      } as unknown as EditorVisibilityState,
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(DesktopPartFilter, {
          editor: fakeEditor as SkinEditorState,
        }),
      )
    })

    expect(host.textContent).toContain("Layer 1")
    expect(host.textContent).toContain("Layer 2")

    const bodyHead = host.querySelector("button[aria-label='Toggle Layer 1 Head']") as HTMLButtonElement
    const armorHead = host.querySelector("button[aria-label='Toggle Layer 2 Head']") as HTMLButtonElement
    const allBodyBtn = host.querySelector("button[aria-label='Toggle whole layer (Layer 1)']") as HTMLButtonElement
    const allArmorBtn = host.querySelector("button[aria-label='Toggle whole layer (Layer 2)']") as HTMLButtonElement

    expect(bodyHead).not.toBeNull()
    expect(armorHead).not.toBeNull()
    expect(allBodyBtn).not.toBeNull()
    expect(allArmorBtn).not.toBeNull()

    expect(bodyHead.className).toContain("bg-base-content/60")
    expect(armorHead.className).toContain("bg-primary")

    flushSync(() => {
      bodyHead.click()
    })
    expect(toggledBody).toBe("head")

    flushSync(() => {
      armorHead.click()
    })
    expect(toggledArmor).toBe("head")

    flushSync(() => {
      allBodyBtn.click()
    })
    expect(allBodyToggled).toBe(true)

    flushSync(() => {
      allArmorBtn.click()
    })
    expect(allArmorToggled).toBe(true)
  })
})
