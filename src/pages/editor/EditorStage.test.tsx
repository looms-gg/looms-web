import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorStage } from "./EditorStage"
import { EDITOR_KEYBIND_TIPS } from "./EditorActionBar"
import * as stageFx from "../../skin/stageFx"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { EditorColorsState } from "./tools/useEditorColors"
import type { EditorVisibilityState } from "./tools/useEditorVisibility"
import type { SkinEditorState } from "./useSkinEditor"

const state = vi.hoisted(() => ({ instances: [] as any[], raycastMiss: false }))

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>()

  // The editor raycasts against the viewer's skin meshes; a canned hit keeps
  // the interaction test free of real camera math while everything downstream
  // (face basis, wireframe points) runs for real.
  class FakeRaycaster {
    setFromCamera() {}
    intersectObjects(meshes: any[]) {
      // raycastMiss simulates the cursor missing the model (orbit start).
      if (!meshes.length || state.raycastMiss) return []
      return [
        {
          uv: { x: 0.5, y: 0.5 },
          point: new actual.Vector3(0, 0, 0),
          object: meshes[0],
          face: { a: 0, b: 1, c: 2 },
        },
      ]
    }
  }
  return { ...actual, Raycaster: FakeRaycaster }
})

vi.mock("skinview3d", async () => {
  const { Matrix4, Vector3, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } =
    await import("three")

  // A real (non-WebGL) mesh so faceBasisFromIntersection can read real
  // position/uv attributes during interaction tests.
  const skinMesh = () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    )
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 2))
    return new Mesh(geometry, new MeshBasicMaterial())
  }

  class FakeSkinViewer {
    opts: any
    renderPaused = false
    zoom = 0.62
    fov: number
    renderer: any
    scene: any
    camera: any
    controls: any
    fireChange!: () => void
    playerWrapper: any
    playerObject: any
    skinCanvas!: HTMLCanvasElement
    fxaaPass = { enabled: true }
    globalLight = { intensity: 0 }
    cameraLight: any = { intensity: 0, color: null }
    loadSkin!: ReturnType<typeof vi.fn>
    setSize!: ReturnType<typeof vi.fn>
    dispose!: ReturnType<typeof vi.fn>

    constructor(opts: any) {
      this.opts = opts
      this.fov = opts.fov
      const renderer = {
        shadowMap: { enabled: false },
        toneMapping: null,
        outputColorSpace: "",
        setClearColor: vi.fn(),
        render: vi.fn(),
      }
      const changeListeners = new Set<() => void>()
      // Every layer is a real (non-WebGL) mesh: the editor's visibility sync
      // flips .visible on each layer, and raycast targets need geometry.
      const part = () => ({
        visible: true,
        innerLayer: skinMesh(),
        outerLayer: skinMesh(),
      })
      Object.assign(this, {
        renderer,
        scene: { getObjectByName: () => undefined, add: vi.fn(), remove: vi.fn() },
        camera: {
          position: new Vector3(),
          lookAt: vi.fn(),
          updateMatrixWorld: vi.fn(),
          matrixWorldInverse: new Matrix4(),
        },
        controls: {
          enabled: true,
          enablePan: true,
          minPolarAngle: 0,
          maxPolarAngle: Math.PI,
          target: new Vector3(),
          addEventListener: (type: string, cb: () => void) => {
            if (type === "change") changeListeners.add(cb)
          },
          removeEventListener: (type: string, cb: () => void) => {
            if (type === "change") changeListeners.delete(cb)
          },
          update: vi.fn(),
          saveState: vi.fn(),
          reset: vi.fn(),
          getPolarAngle: () => Math.PI / 2,
        },
        fireChange: () => {
          for (const cb of [...changeListeners]) cb()
        },
        playerWrapper: new Group(),
        playerObject: {
          skin: {
            visible: false,
            map: null,
            traverse: vi.fn(),
            layer1Material: { dispose: vi.fn(), map: null, needsUpdate: false },
            layer1MaterialBiased: { dispose: vi.fn(), map: null, needsUpdate: false },
            layer2Material: { dispose: vi.fn(), map: null, needsUpdate: false },
            layer2MaterialBiased: { dispose: vi.fn(), map: null, needsUpdate: false },
            head: part(),
            body: part(),
            rightArm: part(),
            leftArm: part(),
            rightLeg: part(),
            leftLeg: part(),
          },
          cape: {},
          elytra: {},
          ears: {},
        },
        skinCanvas: document.createElement("canvas"),
        loadSkin: vi.fn(),
        setSize: vi.fn(),
        dispose: vi.fn(),
        composer: {
          renderTarget1: { setSize: vi.fn() },
          renderTarget2: { setSize: vi.fn() },
        },
      })
      state.instances.push(this)
    }
  }

  return { SkinViewer: FakeSkinViewer, FunctionAnimation: class {} }
})

function makeEditor(overrides: Partial<SkinEditorState> = {}) {
  const textureSubscribers: Array<() => void> = []
  const editor: Partial<SkinEditorState> = {
    bufferCanvas: document.createElement("canvas"),
    model: "classic",
    brush: {
      data: { tool: "pencil", brushSize: 1, brushShape: "square", gridVisible: true },
      patch: () => {},
    } as unknown as EditorBrushState,
    colors: { data: {} } as unknown as EditorColorsState,
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
      limbs: {
        head: true,
        body: true,
        rightArm: true,
        leftArm: true,
        rightLeg: true,
        leftLeg: true,
      },
      layers: { inner: true, outer: true },
    } as unknown as EditorVisibilityState,
    subscribeTextureUpdate: (cb: () => void) => {
      textureSubscribers.push(cb)
      return () => {}
    },
    beginStroke: () => {},
    applyStrokeAtTexel: () => {},
    endStroke: () => {},
    ...overrides,
  }
  return { editor: editor as SkinEditorState, textureSubscribers }
}

async function mountEditorStage(editor: SkinEditorState) {
  const host = document.createElement("div")
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(
        React.createElement(EditorStage, {
          editor,
          uvDrawerOpen: false,
          onToggleUvDrawer: () => {},
          onOpenSave: () => {},
        }),
      )
    })
  })
  return { host, unmount: () => root.unmount() }
}

const nextFrames = async (n = 2) => {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    })
  }
}

describe("EditorStage", () => {
  beforeEach(() => {
    // happy-dom's 2d context stub lacks real canvas methods; every consumer
    // in these components guards a null context, so return null.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
  })

  it("renders 3D stage and overlay action buttons with MineSkin 1:1 layout", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)

    const gridBtn = host.querySelector("button[aria-label='Toggle Grid']")
    const uvBtn = host.querySelector("button[aria-label='Toggle 2D UV Sheet']")
    const saveBtn = host.querySelector("button[aria-label='Save & Export']")

    expect(gridBtn).not.toBeNull()
    expect(uvBtn).not.toBeNull()
    expect(saveBtn).not.toBeNull()
  })

  it("mounts the same studio live viewer (fov 38) on the stage canvas", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)
    const canvas = host.querySelector("canvas.skin-stage-canvas")
    const viewer = state.instances.at(-1)

    expect(viewer).toBeTruthy()
    expect(viewer.opts.fov).toBe(38)
    expect(viewer.opts.canvas).toBe(canvas)
  })

  it("renders on demand: paused loop, coalesced frames, no idle renders", async () => {
    const { editor } = makeEditor()
    await mountEditorStage(editor)
    const viewer = state.instances.at(-1)

    expect(viewer.renderPaused).toBe(true)

    await nextFrames()
    const render = viewer.renderer.render
    const afterMount = render.mock.calls.length
    expect(afterMount).toBeGreaterThan(0)

    // Idle: no further frames beyond the initial one.
    await nextFrames(3)
    expect(render.mock.calls.length).toBe(afterMount)

    // Orbiting fires many change events per drag; one frame per rAF.
    viewer.fireChange()
    viewer.fireChange()
    viewer.fireChange()
    await nextFrames()
    expect(render.mock.calls.length).toBe(afterMount + 1)
  })

  it("coalesces paint texture updates into one frame per rAF", async () => {
    const { editor, textureSubscribers } = makeEditor()
    await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()
    const render = viewer.renderer.render
    const afterMount = render.mock.calls.length

    for (const cb of textureSubscribers) cb()
    for (const cb of textureSubscribers) cb()
    for (const cb of textureSubscribers) cb()
    await nextFrames()
    expect(render.mock.calls.length).toBe(afterMount + 1)
  })

  it("grids only the hovered limb's top-most visible layer, hiding while orbiting", async () => {
    const { editor } = makeEditor({
      brush: { data: { gridVisible: true } } as unknown as EditorBrushState,
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
            rightArm: false,
            leftArm: true,
            rightLeg: true,
            leftLeg: true,
          },
        },
      } as unknown as EditorVisibilityState,
    })
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const grid = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLineSegments)
    expect(grid).toBeTruthy()
    // Nothing is under the cursor yet, so no limb carries the grid.
    expect(grid.visible).toBe(false)

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 10, clientY: 10, bubbles: true }),
    )
    await nextFrames()

    // FakeRaycaster hits the first interactive mesh (head's outer layer), so
    // only that piece carries the grid, whatever the active tool.
    expect(grid.visible).toBe(true)
    expect(grid.geometry.getAttribute("position").count).toBeGreaterThan(0)

    // A press that misses the model hands the drag to the orbit controls; the
    // grid must not follow the cursor mid-orbit.
    state.raycastMiss = true
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true }),
    )
    state.raycastMiss = false
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 40, clientY: 40, bubbles: true }),
    )
    await nextFrames()
    expect(grid.visible).toBe(false)

    // Release ends the orbit; hovering grids the piece under the cursor again.
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 40, clientY: 40, bubbles: true }),
    )
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 30, clientY: 30, bubbles: true }),
    )
    await nextFrames()
    expect(grid.visible).toBe(true)
  })

  it("shows and schedules the brush footprint outline on hover", async () => {
    const { editor } = makeEditor({
      brush: { data: { tool: "pencil", brushSize: 2, brushShape: "square" } } as unknown as EditorBrushState,
    })
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const line = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLine && !obj.isLineSegments)
    expect(line).toBeTruthy()
    expect(line.visible).toBe(false)

    const render = viewer.renderer.render
    const before = render.mock.calls.length

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 10, clientY: 10, bubbles: true }),
    )
    await nextFrames()

    expect(line.visible).toBe(true)
    expect(line.geometry.getAttribute("position").count).toBeGreaterThan(0)
    expect(render.mock.calls.length).toBe(before + 1)

    // Pointer moves that stay on the same texel keep the footprint identical,
    // so they must not schedule new frames (hover cost ≈ one raycast).
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 40, clientY: 40, bubbles: true }),
    )
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 80, clientY: 30, bubbles: true }),
    )
    await nextFrames()
    expect(render.mock.calls.length).toBe(before + 1)
  })

  it("shows the shape outline during a drag and commits once on release", async () => {
    const commitShape = vi.fn()
    const beginStroke = vi.fn()
    const endStroke = vi.fn()
    const applyStrokeAtTexel = vi.fn()
    const { editor } = makeEditor({
      brush: { data: { tool: "shape", shapeKind: "rectangle" } } as unknown as EditorBrushState,
      commitShape,
      beginStroke,
      endStroke,
      applyStrokeAtTexel,
    })
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const line = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLine && !obj.isLineSegments)

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement

    // Down: snapshot only, nothing painted
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true }),
    )
    expect(beginStroke).toHaveBeenCalledTimes(1)
    expect(commitShape).not.toHaveBeenCalled()
    expect(applyStrokeAtTexel).not.toHaveBeenCalled()

    // Move: preview updates, still nothing painted
    canvas.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 20, clientY: 20, bubbles: true }),
    )
    await nextFrames()
    expect(commitShape).not.toHaveBeenCalled()
    expect(applyStrokeAtTexel).not.toHaveBeenCalled()
    expect(line.visible).toBe(true)
    expect(line.geometry.getAttribute("position").count).toBeGreaterThan(0)

    // Up: one shape commit as a single undo entry, preview hidden again
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 20, clientY: 20, bubbles: true }),
    )
    await nextFrames()
    // FakeRaycaster always hits uv (0.5, 0.5) -> texel (32, 32)
    expect(commitShape).toHaveBeenCalledTimes(1)
    expect(commitShape).toHaveBeenCalledWith(
      { x: 32, y: 32 },
      { x: 32, y: 32 },
      { secondary: false },
    )
    expect(endStroke).toHaveBeenCalledTimes(1)
    expect(line.visible).toBe(false)
  })

  it("repaints when a drag's resolution is restored on release", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()
    const render = viewer.renderer.render

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true }),
    )
    canvas.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 20, clientY: 20, bubbles: true }),
    )
    await nextFrames()
    const beforeRelease = render.mock.calls.length

    // Restoring the pixel ratio reallocates the drawing buffer, which clears
    // the canvas; without a following frame the stage shows the stale fx
    // overlays (a black silhouette) until the next interaction.
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 20, clientY: 20, bubbles: true }),
    )
    await nextFrames()
    expect(render.mock.calls.length).toBe(beforeRelease + 1)
  })

  it("drains several paint moves into one stroke application per frame", async () => {
    const applyStrokeAtTexel = vi.fn()
    const { editor } = makeEditor({ applyStrokeAtTexel })
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()
    const render = viewer.renderer.render
    const afterMount = render.mock.calls.length

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true }),
    )
    expect(applyStrokeAtTexel).toHaveBeenCalledTimes(1)

    // Touch and high-poll mice queue several moves before the next frame;
    // they drain as a single texel application per rAF.
    for (let i = 0; i < 5; i++) {
      canvas.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 20 + i, clientY: 20, bubbles: true }),
      )
    }
    await nextFrames()
    expect(applyStrokeAtTexel).toHaveBeenCalledTimes(2)
    expect(render.mock.calls.length).toBe(afterMount + 1)
  })

  it("hides the brush footprint while orbiting and restores it after release", async () => {
    const { editor } = makeEditor({
      brush: { data: { tool: "pencil", brushSize: 2, brushShape: "square" } } as unknown as EditorBrushState,
    })
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const line = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLine && !obj.isLineSegments)
    expect(line).toBeTruthy()

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement

    // Press that misses the model hands the drag to the orbit controls.
    state.raycastMiss = true
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true }),
    )

    // Cursor crosses the model mid-orbit: the footprint must stay hidden.
    state.raycastMiss = false
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 40, clientY: 40, bubbles: true }),
    )
    await nextFrames()
    expect(line.visible).toBe(false)

    // Release ends the orbit; hovering previews again.
    canvas.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 40, clientY: 40, bubbles: true }),
    )
    canvas.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 30, clientY: 30, bubbles: true }),
    )
    await nextFrames()
    expect(line.visible).toBe(true)
  })

  it("mounts a grey ground arrow icon at the model's feet, pointing to its front", async () => {
    const { editor } = makeEditor()
    const { unmount } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)

    const arrow = viewer.playerWrapper.children.find((obj: any) => obj.isMesh)
    expect(arrow).toBeTruthy()
    expect(arrow.visible).toBe(true)

    const pos = arrow.geometry.getAttribute("position")
    let tipZ = -Infinity
    for (let i = 0; i < pos.count; i++) tipZ = Math.max(tipZ, pos.getZ(i))
    expect(tipZ).toBeGreaterThan(8)

    // Unmount removes the arrow and frees its resources.
    const disposed: string[] = []
    arrow.geometry.addEventListener("dispose", () => disposed.push("geometry"))
    arrow.material.addEventListener("dispose", () => disposed.push("material"))
    await act(async () => {
      flushSync(() => unmount())
    })
    expect(disposed).toEqual(["geometry", "material"])
  })

  it("keeps the studio's shadow + rim fx overlays, painted on rendered frames", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)
    await nextFrames()

    const fx = [...host.querySelectorAll<HTMLCanvasElement>("canvas")].filter((c) =>
      c.className.includes("skin-stage-fx"),
    )
    expect(fx.length).toBe(2)
    const webgl = host.querySelector<HTMLCanvasElement>("canvas.skin-stage-canvas")
    expect(webgl).toBeTruthy()
    expect(fx[1].style.opacity).toBe("0.45")

    const section = host.querySelector("section")
    expect(section?.className).toContain("bg-base-200")
    expect(section?.className).not.toContain("bg-radial")

    // The editor's stage is much larger than the studio preview, so its fx
    // copies render at half device resolution (soft overlays tolerate it).
    const paintSpy = vi.spyOn(stageFx, "paintStageFx")
    state.instances.at(-1)?.fireChange()
    await nextFrames()
    const lastCall = paintSpy.mock.calls.at(-1)
    expect(lastCall?.[0]).toBe(webgl)
    expect(lastCall?.[3]).toBe(0.5)
  })

  it("repaints the fx overlays when the drawing buffer is reallocated", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)
    await nextFrames()

    const webgl = host.querySelector<HTMLCanvasElement>("canvas.skin-stage-canvas")
    expect(webgl).toBeTruthy()

    // Settle a marker-only frame first: hovering the model re-grids it, which
    // queues a render without dirtying the fx overlays.
    webgl!.dispatchEvent(
      new MouseEvent("pointermove", { clientX: 10, clientY: 10, bubbles: true }),
    )
    await nextFrames()

    const paintSpy = vi.spyOn(stageFx, "paintStageFx")
    // A resolution switch (or any resize) reallocates the buffer, so overlays
    // baked from the old buffer must be recomputed from the new one.
    webgl!.width += 64
    webgl!.dispatchEvent(new MouseEvent("pointerleave", { bubbles: true }))
    await nextFrames()

    expect(paintSpy).toHaveBeenCalled()
  })

  it("shows the stage keybind tips in the bottom bar", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)

    for (const tip of EDITOR_KEYBIND_TIPS) {
      expect(host.textContent).toContain(tip.text)
    }
    expect(host.textContent).toContain("Drag")
    expect(host.textContent).toContain("Right click")
    expect(host.textContent).toContain("Double click")
  })

  it("right-click strokes paint with the secondary color", async () => {
    const applyStrokeAtTexel = vi.fn()
    const { editor } = makeEditor({ applyStrokeAtTexel })
    const { host } = await mountEditorStage(editor)
    await nextFrames()

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { button: 2, clientX: 10, clientY: 10, bubbles: true }),
    )
    expect(applyStrokeAtTexel).toHaveBeenCalledWith({ x: 32, y: 32 }, { secondary: true })

    // The browser menu never interrupts a right-drag stroke.
    const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
    canvas.dispatchEvent(menu)
    expect(menu.defaultPrevented).toBe(true)
  })

  it("Shift hands the press to the camera instead of painting", async () => {
    const applyStrokeAtTexel = vi.fn()
    const beginStroke = vi.fn()
    const { editor } = makeEditor({ applyStrokeAtTexel, beginStroke })
    const { host } = await mountEditorStage(editor)
    await nextFrames()

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        button: 0,
        shiftKey: true,
        clientX: 10,
        clientY: 10,
        bubbles: true,
      }),
    )
    expect(beginStroke).not.toHaveBeenCalled()
    expect(applyStrokeAtTexel).not.toHaveBeenCalled()
  })

  it("Shift + double-click swings the camera onto the clicked limb", async () => {
    const { editor } = makeEditor()
    const { host } = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const before = viewer.camera.position.length()

    const canvas = host.querySelector("canvas.skin-stage-canvas") as HTMLCanvasElement
    canvas.dispatchEvent(
      new MouseEvent("dblclick", { shiftKey: true, clientX: 10, clientY: 10, bubbles: true }),
    )
    await nextFrames()

    expect(viewer.controls.update).toHaveBeenCalled()
    expect(viewer.camera.position.length()).not.toBe(before)
  })
})
