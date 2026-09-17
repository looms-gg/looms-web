import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorStage } from "./EditorStage"
import * as stageFx from "../../skin/stageFx"
import type { EditorBrushState } from "./tools/useEditorBrush"
import type { EditorColorsState } from "./tools/useEditorColors"
import type { EditorVisibilityState } from "./tools/useEditorVisibility"
import type { SkinEditorState } from "./useSkinEditor"

const state = vi.hoisted(() => ({ instances: [] as any[] }))

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>()

  // The editor raycasts against the viewer's skin meshes; a canned hit keeps
  // the interaction test free of real camera math while everything downstream
  // (face basis, wireframe points) runs for real.
  class FakeRaycaster {
    setFromCamera() {}
    intersectObjects(meshes: any[]) {
      if (!meshes.length) return []
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
  const { Euler, Matrix4, Vector3, BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial } =
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
        playerWrapper: { rotation: new Euler(), position: new Vector3() },
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
  return host
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
    const host = await mountEditorStage(editor)

    const gridBtn = host.querySelector("button[aria-label='Toggle Grid']")
    const uvBtn = host.querySelector("button[aria-label='Toggle 2D UV Sheet']")
    const editingBtn = host.querySelector("button[aria-label='Mode Switcher']")
    const saveBtn = host.querySelector("button[aria-label='Save & Export']")

    expect(gridBtn).not.toBeNull()
    expect(uvBtn).not.toBeNull()
    expect(editingBtn).not.toBeNull()
    expect(saveBtn).not.toBeNull()
  })

  it("mounts the same studio live viewer (fov 38) on the stage canvas", async () => {
    const { editor } = makeEditor()
    const host = await mountEditorStage(editor)
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

  it("grids the top-most visible layer of each limb, honoring the grid toggle", async () => {
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
    await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const grid = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLineSegments)
    expect(grid).toBeTruthy()
    expect(grid.visible).toBe(true)
    expect(grid.geometry.getAttribute("position").count).toBeGreaterThan(0)
  })

  it("shows and schedules the brush footprint outline on hover", async () => {
    const { editor } = makeEditor({
      brush: { data: { tool: "pencil", brushSize: 2, brushShape: "square" } } as unknown as EditorBrushState,
    })
    const host = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const line = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLine)
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
    const host = await mountEditorStage(editor)
    const viewer = state.instances.at(-1)
    await nextFrames()

    const line = viewer.scene.add.mock.calls
      .map((call: any[]) => call[0])
      .find((obj: any) => obj.isLine)

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
    expect(commitShape).toHaveBeenCalledWith({ x: 32, y: 32 }, { x: 32, y: 32 })
    expect(endStroke).toHaveBeenCalledTimes(1)
    expect(line.visible).toBe(false)
  })

  it("keeps the studio's shadow + rim fx overlays, painted on rendered frames", async () => {
    const { editor } = makeEditor()
    const host = await mountEditorStage(editor)
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
})
