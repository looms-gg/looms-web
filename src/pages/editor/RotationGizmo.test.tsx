import React from "react"
import { describe, it, expect, vi } from "vitest"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { Matrix4, Vector3 } from "three"
import { RotationGizmo } from "./RotationGizmo"

function makeViewer() {
  const changeListeners = new Set<() => void>()
  return {
    camera: {
      position: new Vector3(0, 0, 45),
      lookAt: vi.fn(),
      matrixWorldInverse: new Matrix4(),
    },
    controls: {
      // Real three OrbitControls (r150+) no longer exposes rotateLeft/rotateUp
      enabled: true,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
      target: new Vector3(0, 0, 0),
      addEventListener: (type: string, cb: () => void) => {
        if (type === "change") changeListeners.add(cb)
      },
      removeEventListener: (_type: string, cb: () => void) => {
        changeListeners.delete(cb)
      },
      update: vi.fn(),
    },
    render: vi.fn(),
  }
}

function firePointer(el: Element, type: string, x: number, y: number) {
  const Ctor = (window as any).PointerEvent || (window as any).MouseEvent
  el.dispatchEvent(
    new Ctor(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1 }),
  )
}

describe("RotationGizmo", () => {
  it("renders gizmo canvas with title", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        React.createElement(RotationGizmo, {
          viewer: null,
          size: 96,
        }),
      )
    })

    const canvas = host.querySelector("canvas")
    expect(canvas).not.toBeNull()
    expect(host.querySelector("div")?.getAttribute("title")).toContain("Rotation Gizmo")
  })

  it("orbits the camera when dragged", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
    const viewer = makeViewer()
    const host = document.createElement("div")
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => {
      flushSync(() => {
        root.render(React.createElement(RotationGizmo, { viewer: viewer as any, size: 96 }))
      })
    })

    const canvas = host.querySelector("canvas")!
    const start = viewer.camera.position.clone()
    await act(async () => {
      firePointer(canvas, "pointerdown", 48, 48)
      firePointer(canvas, "pointermove", 98, 48)
      firePointer(canvas, "pointerup", 98, 48)
    })

    expect(viewer.camera.position.distanceTo(start)).toBeGreaterThan(1)
    expect(viewer.camera.position.distanceTo(viewer.controls.target)).toBeCloseTo(45, 5)
    expect(viewer.camera.lookAt).toHaveBeenCalled()
    expect(viewer.controls.update).toHaveBeenCalled()
    expect(viewer.render).toHaveBeenCalled()
    host.remove()
  })
})
