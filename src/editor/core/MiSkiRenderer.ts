import {
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
} from "../color/colorUtils";
import { MAX_VARIATION_STEPS, randomInRange } from "./utils";
import {
  getRendererState,
  subscribeToRenderer,
  type EnvironmentPreset,
  type Layers,
  type Parts,
  type RendererStore,
} from "../store";
import type { Backend } from "./backend/Backend";
import { createBackend } from "./backend/createBackend";
import { downloadFile, type SaveImageLabels } from "./downloadFile";
import { EditInputManager } from "./EditInputManager";
import { identityM44, multiplyM4V3, type M44, type V3 } from "./maths";
import { Mesh, MeshGroup } from "./mesh";
import { MeshImageMaterial, MinecraftSkinMaterial } from "./MeshMaterial";
import { MinecraftSkin } from "./MinecraftSkin";
import { computeRay, getMeshAtRay, getMeshsAtRay } from "./rayTracing";
import { Renderer } from "./Renderer";
import { mirrorSkinTexel } from "./skinMirror";
import { UndoRedoManager } from "./UndoManager";
import {
  animateEnvironmentWorld,
  createEnvironmentWorld,
  getEnvironmentCameraFloorY,
} from "./environment";
import { bodies, DEFAULT_BODY_ID } from "../../data/bodies";


// Shading snaps to a fixed HSV lattice: brightness moves in whole rungs and
// hue/saturation round to a coarse grid, so repeated strokes reuse a small
// ladder of shades per base color instead of minting a new unique color on
// every pass.
const SHADE_VALUE_STEP = 5; // % brightness per rung
const SHADE_HUE_STEP = 4; // degrees
const SHADE_SAT_STEP = 4; // %

export class MiSkiRenderer extends Renderer {
  public undoRedoManager: UndoRedoManager;
  private unsubscribe: (() => void) | null = null;
  private environmentMesh: MeshGroup | null = null;
  private guideSkin: MinecraftSkin | null = null;
  private lastGuideBodyId: string | null = null;

  constructor(backend: Backend) {
    super(backend);
    this.undoRedoManager = new UndoRedoManager(this);
  }

  public override mount() {
    super.mount();

    // Subscribe to store for visibility changes
    this.unsubscribe = subscribeToRenderer((state, prevState) => {
      this.onStoreChange(state, prevState);
    });

    // Apply current visibility state immediately — load() may have
    // updated the store before we subscribed, so we'd miss the change.
    this.updateMeshVisibility(getRendererState());
    void this.setupGuideBody();

    this.undoRedoManager.mountListeners();
  }

  public override unmount() {
    // Create a copy of children array to avoid modifying collection while iterating
    const meshesToRemove = [...this.world.getChildren()];
    for (const mesh of meshesToRemove) {
      this.world.removeMesh(mesh);
    }

    // Unsubscribe from store
    this.unsubscribe?.();
    this.unsubscribe = null;

    this.undoRedoManager.unmountListeners();
    super.unmount();
  }

  private onStoreChange(state: RendererStore, prevState: RendererStore) {
    // Handle visibility changes
    if (this.visibilityChanged(state, prevState)) {
      this.updateMeshVisibility(state);
    }

    if (state.environmentPreset !== prevState.environmentPreset) {
      this.applyEnvironment(state.environmentPreset);

      // Clamp camera phi when switching to an environment so the camera
      // isn't already below the ground plane.
      const floorY = getEnvironmentCameraFloorY(state.environmentPreset);
      if (floorY !== null) {
        const ratio = Math.min(1, -floorY / state.cameraRadius);
        const maxPhi = Math.asin(ratio);
        const clamped = Math.max(
          -Math.PI / 2,
          Math.min(state.cameraPhi, maxPhi),
        );
        if (clamped !== state.cameraPhi) {
          state.setValue("cameraPhi", clamped);
        }
      }
    }

    if (
      state.guideBodyVisible !== prevState.guideBodyVisible ||
      state.guideBodyId !== prevState.guideBodyId
    ) {
      if (state.guideBodyId !== this.lastGuideBodyId) {
        void this.setupGuideBody();
      } else {
        this.updateGuideVisibility();
      }
    }
  }

  /**
   * Reference body shown behind the garment layer. It is a separate mesh with
   * its own texture, so it never leaks into the painted texture or the export.
   */
  async setupGuideBody() {
    const state = getRendererState();
    const body =
      bodies.find((b: { id: string }) => b.id === state.guideBodyId) ??
      bodies.find((b: { id: string }) => b.id === DEFAULT_BODY_ID);
    if (!body) return;
    this.lastGuideBodyId = body.id;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = body.skin;
    });
    const material = MinecraftSkinMaterial.createFrom64Image(img);
    if (this.guideSkin) {
      this.backend.cleanupMeshGroup(this.guideSkin);
      this.removeMesh(this.guideSkin);
      this.guideSkin = null;
    }
    const guideSkin = await MinecraftSkin.create(
      "GuideBody",
      this.world,
      material.imageData,
    );
    this.guideSkin = guideSkin;
    this.addMesh(guideSkin);
    this.backend.bindMeshGroup(guideSkin);
    this.updateGuideVisibility();
  }

  updateGuideVisibility() {
    if (this.guideSkin) {
      this.guideSkin.visible = getRendererState().guideBodyVisible;
    }
  }

  private visibilityChanged(
    state: RendererStore,
    prevState: RendererStore,
  ): boolean {
    return (
      state.skinIsSlim !== prevState.skinIsSlim ||
      state.baseheadVisible !== prevState.baseheadVisible ||
      state.basebodyVisible !== prevState.basebodyVisible ||
      state.baseleftArmVisible !== prevState.baseleftArmVisible ||
      state.baserightArmVisible !== prevState.baserightArmVisible ||
      state.baseleftLegVisible !== prevState.baseleftLegVisible ||
      state.baserightLegVisible !== prevState.baserightLegVisible ||
      state.overlayheadVisible !== prevState.overlayheadVisible ||
      state.overlaybodyVisible !== prevState.overlaybodyVisible ||
      state.overlayleftArmVisible !== prevState.overlayleftArmVisible ||
      state.overlayrightArmVisible !== prevState.overlayrightArmVisible ||
      state.overlayleftLegVisible !== prevState.overlayleftLegVisible ||
      state.overlayrightLegVisible !== prevState.overlayrightLegVisible
    );
  }

  public updateMeshVisibility(state: RendererStore): void {
    const mainSkinInstance = this.getMainSkin();
    if (!mainSkinInstance) return;

    // Reset all arms
    if (mainSkinInstance.baseLeftArm)
      mainSkinInstance.baseLeftArm.visible = false;
    if (mainSkinInstance.baseLeftSlimArm)
      mainSkinInstance.baseLeftSlimArm.visible = false;
    if (mainSkinInstance.baseRightArm)
      mainSkinInstance.baseRightArm.visible = false;
    if (mainSkinInstance.baseRightSlimArm)
      mainSkinInstance.baseRightSlimArm.visible = false;
    if (mainSkinInstance.overlayLeftArm)
      mainSkinInstance.overlayLeftArm.visible = false;
    if (mainSkinInstance.overlayLeftSlimArm)
      mainSkinInstance.overlayLeftSlimArm.visible = false;
    if (mainSkinInstance.overlayRightArm)
      mainSkinInstance.overlayRightArm.visible = false;
    if (mainSkinInstance.overlayRightSlimArm)
      mainSkinInstance.overlayRightSlimArm.visible = false;

    // Get every part visibility
    (
      [
        ["overlay", "head"],
        ["overlay", "body"],
        ["overlay", "leftLeg"],
        ["overlay", "rightLeg"],
        ["overlay", "leftArm"],
        ["overlay", "rightArm"],
        ["base", "head"],
        ["base", "body"],
        ["base", "leftLeg"],
        ["base", "rightLeg"],
        ["base", "leftArm"],
        ["base", "rightArm"],
      ] as [Layers, Parts][]
    ).forEach(([layer, part]) => {
      mainSkinInstance.onVisibilityChangeFromStore(layer, part, state);
    });
  }

  protected applyEnvironment(preset: EnvironmentPreset): void {
    if (this.environmentMesh) {
      this.backend.cleanupMeshGroup(this.environmentMesh);
      this.removeMesh(this.environmentMesh);
      this.environmentMesh = null;
    }

    const environment = createEnvironmentWorld(preset);
    if (!environment) return;

    this.environmentMesh = environment;
    this.addMesh(environment);
    this.backend.bindMeshGroup(environment);
  }

  public handleSlimSwitch(newIsSlim: boolean): void {
    const skin = this.getMainSkin();
    const state = getRendererState();

    if (newIsSlim) {
      this.undoRedoManager.beginBatch();
      skin.material = skin.material.convertToSlim();
      state.setValue("skinIsSlim", true, "App");
      this.undoRedoManager.endBatch();
    } else {
      this.undoRedoManager.beginBatch();
      skin.material = skin.material.convertToClassic();
      state.setValue("skinIsSlim", false, "App");
      this.undoRedoManager.endBatch();
    }
  }

  public flipFrontToBack(): void {
    const skin = this.getMainSkin();
    const state = getRendererState();

    this.undoRedoManager.beginBatch();
    skin.material = skin.material.flipFrontToBack(state.skinIsSlim);
    this.undoRedoManager.endBatch();
  }

  getMainSkin(): MinecraftSkin {
    const s = this.world
      .getChildren()
      .find((grp) => grp.name === "MainSkin") as MinecraftSkin;

    return s;
  }

  public start(): number {
    if (this.environmentMesh) {
      const state = getRendererState();
      animateEnvironmentWorld(
        this.environmentMesh,
        state.environmentPreset,
        performance.now(),
      );
    }
    const deltaTime = super.start();
    return deltaTime;
  }

  public downloadTexture(name?: string, labels?: SaveImageLabels) {
    const dataUrl = this.getMainSkin().material.toDataUrl();
    downloadFile(dataUrl, name ? `${name}.png` : "texture.png", labels);
  }

  public redo() {
    this.undoRedoManager.redo();
  }

  public undo() {
    this.undoRedoManager.undo();
  }

  reset(): void {
    getRendererState().reset();
    this.undoRedoManager.reset();
  }

  public getMeshHitAt(x: number, y: number) {
    if (!this.backend.canvas) return;
    const skinObject = this.getMainSkin();

    const ray = computeRay(
      x,
      y,
      this.backend.canvas.width,
      this.backend.canvas.height,
      this.backend.getProjectTransformation(),
      this.backend.getViewTransformation(),
      this.backend.getGlobalTransformation(),
    );
    const hit = getMeshAtRay(skinObject, ray);
    if (!hit) return;
    if (hit.mesh.metadata.type === "skinPixel") {
      return hit;
    }
    return null;
  }

  public getMeshsHitAt(x: number, y: number) {
    if (!this.backend.canvas) return [];
    const skinObject = this.getMainSkin();

    const ray = computeRay(
      x,
      y,
      this.backend.canvas.width,
      this.backend.canvas.height,
      this.backend.getProjectTransformation(),
      this.backend.getViewTransformation(),
      this.backend.getGlobalTransformation(),
    );
    const hits = getMeshsAtRay(skinObject, ray);
    return [...hits]
      .sort((a, b) => a.t - b.t)
      .filter((h) => h.mesh.metadata.type === "skinPixel");
  }

  public getMode() {
    return this instanceof MiSkiEditingRenderer ? "Editing" : "Preview";
  }

  static async setup(canvas: HTMLCanvasElement) {
    const backend = await createBackend(canvas);
    const renderer = new this(backend);
    const state = getRendererState();

    // The editor always starts from a blank transparent garment layer; the
    // guide body is a separate mesh and never part of the painted texture.
    const blank = new ImageData(64, 64);
    const skin = await MinecraftSkin.create("MainSkin", renderer.world, blank);
    state.setValue("skinIsSlim", false, "App");

    renderer.addMesh(skin);
    renderer.backend.bindMeshGroup(skin);
    renderer.applyEnvironment(state.environmentPreset);
    await renderer.setupGuideBody();
    return renderer;
  }
}

export class MiSkiEditingRenderer extends MiSkiRenderer {
  public inputManager: EditInputManager;

  constructor(backend: Backend) {
    super(backend);
    this.inputManager = new EditInputManager(this);
  }

  public override mount() {
    super.mount();
    this.inputManager.mountListeners();
  }

  public override unmount() {
    this.inputManager.unmountListeners();
    super.unmount();
  }

  public pickColor(x: number, y: number) {
    const hits = this.getMeshsHitAt(x, y);
    const material = this.getMainSkin().material;
    if (!material) return;
    const color = hits
      .filter((hit) => hit.mesh.visible)
      .map((hit) =>
        material.getPixel(
          hit.mesh.metadata.u as number,
          hit.mesh.metadata.v as number,
        ),
      )
      .filter((color) => color && color[3] > 0)[0];
    if (!color) return;
    const hex = rgbToHex(color[0], color[1], color[2]);
    const state = getRendererState();
    state.setValue("paintColor", hex, "App");
    state.setValue("paintAlpha", color[3], "App");
    state.save();
    return hex;
  }

  // Mirror a texel across the model's center plane when symmetry painting is
  // on. Returns null when symmetry is off, the texel has no counterpart, or
  // it mirrors onto itself.
  private mirrorTexel(u: number, v: number): { u: number; v: number } | null {
    const state = getRendererState();
    if (!state.mirrorPaint) return null;
    const mirrored = mirrorSkinTexel(u, v, {
      scale: 1,
      slim: state.skinIsSlim,
    });
    if (!mirrored || (mirrored.u === u && mirrored.v === v)) return null;
    return mirrored;
  }

  // The texels a paint action touches: the hit texel plus its mirror.
  private paintTargets(u: number, v: number): [number, number][] {
    const mirrored = this.mirrorTexel(u, v);
    return mirrored
      ? [
          [u, v],
          [mirrored.u, mirrored.v],
        ]
      : [[u, v]];
  }

  // Walk up from a texel mesh to the face group that carries the atlas rect
  // for the whole face. Used to clamp radius brushes so they never bleed onto
  // unrelated faces packed next to this one in the atlas.
  private faceUvBounds(
    mesh: Mesh,
  ): { minU: number; minV: number; maxU: number; maxV: number } | null {
    let faceGroup: MeshGroup | null = mesh.getParent();
    while (faceGroup && !faceGroup.metadata?.uvBounds) {
      faceGroup = faceGroup.getParent();
    }
    if (!faceGroup || !faceGroup.metadata?.uvBounds) return null;
    return faceGroup.metadata.uvBounds as {
      minU: number;
      minV: number;
      maxU: number;
      maxV: number;
    };
  }

  // The base layer renders opaque in-game, so translucent paint there would
  // just darken against black. Base-layer texels always take full opacity;
  // only overlay parts (tagged metadata.overlay) honor the picked alpha.
  private paintAlphaFor(mesh: Mesh): number {
    let group: MeshGroup | null = mesh.getParent();
    while (group && !group.metadata?.overlay) {
      group = group.getParent();
    }
    return group ? getRendererState().paintAlpha : 255;
  }

  // Last fillFace target within the current bulk stroke. Drags re-fire at
  // pointer-event rate, and repainting an unchanged target only re-uploads an
  // identical texture — so fillFace skips until the hit moves.
  private lastFillTarget: {
    u: number;
    v: number;
    minU: number;
    minV: number;
  } | null = null;

  // Called at the start of every bulk stroke (drag or tap) so its first
  // fillFace always paints.
  public beginFillStroke(): void {
    this.lastFillTarget = null;
  }

  public fillFace(x: number, y: number): void {
    const hit = this.getMeshHitAt(x, y);
    if (!hit) return;
    const bounds = this.faceUvBounds(hit.mesh);
    if (!bounds) return;
    const { minU, minV, maxU, maxV } = bounds;
    const state = getRendererState();
    const material = this.getMainSkin().material;
    const alpha = this.paintAlphaFor(hit.mesh);
    const radius = state.bulkPaintRadius ?? 0;

    // Sized brushes repaint per texel, whole-face fills per face.
    const hu = hit.mesh.metadata.u as number;
    const hv = hit.mesh.metadata.v as number;
    const prev = this.lastFillTarget;
    if (
      prev &&
      (radius > 0
        ? prev.u === hu && prev.v === hv
        : prev.minU === minU && prev.minV === minV)
    ) {
      return;
    }
    this.lastFillTarget = { u: hu, v: hv, minU, minV };

    if (radius > 0) {
      // Paint a clean disc/square of `radius` texels around the hit texel,
      // clamped to THIS face's atlas rect so it never bleeds onto unrelated
      // faces. Hole-free by construction.
      const isCircle = state.bulkPaintShape === "circle";
      const r2 = (radius + 0.5) * (radius + 0.5);
      for (let pv = minV; pv < maxV; pv++) {
        for (let pu = minU; pu < maxU; pu++) {
          const du = pu - hu;
          const dv = pv - hv;
          const inside = isCircle
            ? du * du + dv * dv <= r2
            : Math.abs(du) <= radius && Math.abs(dv) <= radius;
          if (inside) {
            for (const [tu, tv] of this.paintTargets(pu, pv)) {
              material.setPixelHex(tu, tv, state.paintColor, alpha);
            }
          }
        }
      }
      return;
    }

    const width = maxU - minU;
    const height = maxV - minV;
    material.fillRectHex(minU, minV, width, height, state.paintColor, alpha);
    // Symmetry: fill the mirrored face too. Face rects mirror onto same-size
    // rects, so the two mirrored corners are enough to locate it.
    const cornerA = this.mirrorTexel(minU, minV);
    const cornerB = this.mirrorTexel(maxU - 1, maxV - 1);
    if (cornerA && cornerB) {
      material.fillRectHex(
        Math.min(cornerA.u, cornerB.u),
        Math.min(cornerA.v, cornerB.v),
        width,
        height,
        state.paintColor,
        alpha,
      );
    }
  }

  public drawAt(x: number, y: number): void {
    const hit = this.getMeshHitAt(x, y);
    if (!hit) return;
    const state = getRendererState();
    const material = this.getMainSkin().material;
    const alpha = this.paintAlphaFor(hit.mesh);
    for (const [u, v] of this.paintTargets(
      hit.mesh.metadata.u as number,
      hit.mesh.metadata.v as number,
    )) {
      material.setPixelHex(u, v, state.paintColor, alpha);
    }
  }

  public ditherAt(x: number, y: number): void {
    const hit = this.getMeshHitAt(x, y);
    if (!hit) return;

    const u = hit.mesh.metadata.u as number;
    const v = hit.mesh.metadata.v as number;
    // Checkerboard ink: only even-parity texels take paint, so a stroke
    // leaves a 50% dither of the paint color over what's underneath. Parity
    // is checked on the hit texel only so the mirrored side comes out as a
    // true mirror image of the pattern.
    if ((u + v) % 2 !== 0) return;

    const state = getRendererState();
    const material = this.getMainSkin().material;
    const alpha = this.paintAlphaFor(hit.mesh);
    for (const [tu, tv] of this.paintTargets(u, v)) {
      material.setPixelHex(tu, tv, state.paintColor, alpha);
    }
  }

  public eraseAt(x: number, y: number): void {
    const hit = this.getMeshHitAt(x, y);
    if (!hit) return;
    const material = this.getMainSkin().material;
    const state = getRendererState();
    const radius = state.eraserRadius ?? 0;
    const hu = hit.mesh.metadata.u as number;
    const hv = hit.mesh.metadata.v as number;

    if (radius > 0) {
      // Erase a disc of `radius` texels around the hit, clamped to this face's
      // atlas rect so the brush never punches holes in neighbouring faces.
      const bounds = this.faceUvBounds(hit.mesh);
      const minU = bounds ? bounds.minU : hu - radius;
      const maxU = bounds ? bounds.maxU : hu + radius + 1;
      const minV = bounds ? bounds.minV : hv - radius;
      const maxV = bounds ? bounds.maxV : hv + radius + 1;
      const r2 = (radius + 0.5) * (radius + 0.5);
      for (let pv = minV; pv < maxV; pv++) {
        for (let pu = minU; pu < maxU; pu++) {
          const du = pu - hu;
          const dv = pv - hv;
          if (du * du + dv * dv <= r2) {
            for (const [tu, tv] of this.paintTargets(pu, pv)) {
              material.clearPixel(tu, tv);
            }
          }
        }
      }
      return;
    }

    for (const [u, v] of this.paintTargets(hu, hv)) {
      material.clearPixel(u, v);
    }
  }

  public variateAt(x: number, y: number): void {
    const hit = this.getMeshHitAt(x, y);
    if (!hit) return;

    const state = getRendererState();
    // variationIntensity is the ceiling on the brightness swing, in whole 5%
    // rungs, always at least 1 — the tool never degrades to a no-op.
    const maxSteps = Math.min(
      MAX_VARIATION_STEPS,
      Math.max(1, Math.round(state.variationIntensity)),
    );

    const u = hit.mesh.metadata.u as number;
    const v = hit.mesh.metadata.v as number;
    const material = this.getMainSkin().material;
    const targets = this.paintTargets(u, v);

    // Get the current pixel color
    const currentColor = material.getPixel(u, v);
    if (!currentColor || currentColor[3] === 0) {
      // If no color or transparent, use the paint color
      const alpha = this.paintAlphaFor(hit.mesh);
      for (const [tu, tv] of targets) {
        material.setPixelHex(tu, tv, state.paintColor, alpha);
      }
      return;
    }

    // Apply variation to the existing color; the mirrored texel receives the
    // same varied color so both sides shade identically.
    const variedColor = this.applyColorVariation(currentColor, maxSteps);
    for (const [tu, tv] of targets) {
      material.setPixel(
        tu,
        tv,
        variedColor[0],
        variedColor[1],
        variedColor[2],
        variedColor[3],
      );
    }
  }

  private applyColorVariation(
    color: [number, number, number, number],
    maxSteps: number,
  ): [number, number, number, number] {
    const hsv = rgbToHsv(color[0], color[1], color[2]);

    // Pick a random magnitude within [1, maxSteps] rungs and a random
    // direction. maxSteps is the intensity-scaled ceiling (see variateAt), so
    // the average strength climbs with intensity while repeated strokes stay
    // organic. The previous mapping (Math.round(3 * intensity)) pinned the
    // whole lower half of the slider to a single rung, so intensity appeared
    // to do nothing.
    const steps = 1 + Math.floor(randomInRange(0, maxSteps));
    const direction = randomInRange(-1, 1) < 0 ? -1 : 1;

    const value = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (hsv.v + direction * steps * SHADE_VALUE_STEP) / SHADE_VALUE_STEP,
        ) * SHADE_VALUE_STEP,
      ),
    );
    const hue = (Math.round(hsv.h / SHADE_HUE_STEP) * SHADE_HUE_STEP) % 360;
    const sat = Math.min(
      100,
      Math.round(hsv.s / SHADE_SAT_STEP) * SHADE_SAT_STEP,
    );
    const rgb = hsvToRgb(hue, sat, value);
    return [rgb.r, rgb.g, rgb.b, color[3]];
  }

  public getUniqueColors(): string[] {
    const skinMesh = this.getMainSkin();
    if (!skinMesh) return [];
    const skinMaterial = skinMesh.getMaterial() as MeshImageMaterial;
    const imageData = skinMaterial.imageData;

    // Count usage per exact color so near-duplicate merging keeps each
    // cluster's dominant shade.
    const counts = new Map<number, number>();
    for (let i = 0; i < imageData.data.length; i += 4) {
      const a = imageData.data[i + 3];
      // Only include non-transparent colors
      if (a === 0) continue;
      const key =
        imageData.data[i] * 0x1000000 +
        imageData.data[i + 1] * 0x10000 +
        imageData.data[i + 2] * 0x100 +
        a;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // Absorb shading residue: any color within MERGE_DISTANCE (RGBA
    // euclidean) of a more-used color is treated as the same swatch. The
    // radius is well under one shading rung (~13), so deliberate shades
    // survive while stray near-duplicates collapse.
    const MERGE_DISTANCE_SQ = 8 * 8;
    const byUsage = Array.from(counts.keys()).sort(
      (a, b) => counts.get(b)! - counts.get(a)!,
    );
    const kept: [number, number, number, number][] = [];
    for (const key of byUsage) {
      const r = key >>> 24;
      const g = (key >>> 16) & 0xff;
      const b = (key >>> 8) & 0xff;
      const a = key & 0xff;
      const absorbed = kept.some(([kr, kg, kb, ka]) => {
        const dr = kr - r;
        const dg = kg - g;
        const db = kb - b;
        const da = ka - a;
        return dr * dr + dg * dg + db * db + da * da <= MERGE_DISTANCE_SQ;
      });
      if (!absorbed) kept.push([r, g, b, a]);
    }

    // kept is already ordered most-used-first (byUsage drives the merge loop),
    // so return it as-is instead of re-sorting by hue — the palette leads with
    // the colors actually painted most.
    return kept.map(([r, g, b, a]) => rgbToHex(r, g, b, a));
  }

  public updateCursor(x: number, y: number): void {
    if (!this.backend.canvas) return;
    const ray = computeRay(
      x,
      y,
      this.backend.canvas.width,
      this.backend.canvas.height,
      this.backend.getProjectTransformation(),
      this.backend.getViewTransformation(),
      this.backend.getGlobalTransformation(),
    );
    const skinObject = this.getMainSkin();
    const opaqueGroup = skinObject
      .getChildren()
      .find((g: MeshGroup | Mesh) => g.name === "opaque") as MeshGroup;
    const transparentGroup = skinObject
      .getChildren()
      .find((g: MeshGroup | Mesh) => g.name === "transparent") as MeshGroup;
    const hitTransparent = transparentGroup
      ? getMeshAtRay(transparentGroup, ray)
      : null;
    const hitOpaque = opaqueGroup ? getMeshAtRay(opaqueGroup, ray) : null;
    let hit = null;
    if (hitTransparent && hitTransparent.mesh.metadata.type === "skinPixel") {
      const part = hitTransparent.mesh;
      if (part.visible) {
        hit = hitTransparent;
      }
    }
    if (!hit && hitOpaque && hitOpaque.mesh.metadata.type === "skinPixel") {
      const part = hitOpaque.mesh;
      if (part.visible) {
        hit = hitOpaque;
      }
    }

    // Hide front indicator when hovering over the skin so it doesn't obstruct drawing
    skinObject.setFrontIndicatorTargetOpacity(hit ? 0 : 1);

    // Update hover highlight border for pixel under cursor; with symmetry on,
    // outline the mirrored texel as well so both stroke targets are visible.
    if (hit) {
      const vertices: number[] = [];
      const normals: number[] = [];
      this.appendTexelBorder(hit.mesh, vertices, normals);
      const mirrored = this.mirrorTexel(
        hit.mesh.metadata.u as number,
        hit.mesh.metadata.v as number,
      );
      if (mirrored) {
        const mirrorMesh = this.getTexelMeshAt(mirrored.u, mirrored.v);
        if (mirrorMesh) this.appendTexelBorder(mirrorMesh, vertices, normals);
      }
      this.hoverHighlight = {
        vertices,
        normals,
        transform: identityM44(),
      };
    } else {
      this.hoverHighlight = null;
    }

    this.backend.canvas.style.cursor = hit ? "crosshair" : "grab";
  }

  // Texel quads indexed by atlas coordinate, per skin instance. Slim and
  // regular arm variants share atlas texels, so entries keep every candidate
  // and lookup picks whichever is currently visible.
  private texelMeshIndex = new WeakMap<MinecraftSkin, Map<number, Mesh[]>>();

  private getTexelMeshAt(u: number, v: number): Mesh | null {
    const skin = this.getMainSkin();
    if (!skin) return null;
    let index = this.texelMeshIndex.get(skin);
    if (!index) {
      index = new Map();
      const gather = (group: MeshGroup) => {
        for (const child of group.getChildren()) {
          if (child instanceof MeshGroup) {
            gather(child);
          } else if (child.metadata.type === "skinPixel") {
            const key =
              ((child.metadata.u as number) << 8) |
              (child.metadata.v as number);
            const list = index!.get(key);
            if (list) {
              list.push(child);
            } else {
              index!.set(key, [child]);
            }
          }
        }
      };
      gather(skin);
      this.texelMeshIndex.set(skin, index);
    }
    const candidates = index.get((u << 8) | v);
    return candidates?.find((mesh) => mesh.visible) ?? null;
  }

  // Append the four border strips outlining a texel quad to the highlight
  // geometry, in world space (the quad's parent transform is baked in so
  // outlines from different body parts can share one draw).
  private appendTexelBorder(
    mesh: Mesh,
    outVertices: number[],
    outNormals: number[],
  ): void {
    const v = mesh.vertices;
    const n = mesh.normals;
    const OFFSET = 0.015;
    const normal = [n[0], n[1], n[2]];

    // Extract quad corners with normal offset to prevent z-fighting
    const BL = [
      v[0] + normal[0] * OFFSET,
      v[1] + normal[1] * OFFSET,
      v[2] + normal[2] * OFFSET,
    ];
    const TL = [
      v[3] + normal[0] * OFFSET,
      v[4] + normal[1] * OFFSET,
      v[5] + normal[2] * OFFSET,
    ];
    const BR = [
      v[6] + normal[0] * OFFSET,
      v[7] + normal[1] * OFFSET,
      v[8] + normal[2] * OFFSET,
    ];
    const TR = [
      v[12] + normal[0] * OFFSET,
      v[13] + normal[1] * OFFSET,
      v[14] + normal[2] * OFFSET,
    ];

    // Compute edge directions and border thickness
    const uLen = Math.hypot(BR[0] - BL[0], BR[1] - BL[1], BR[2] - BL[2]);
    const vLen = Math.hypot(TL[0] - BL[0], TL[1] - BL[1], TL[2] - BL[2]);
    const t = Math.min(uLen, vLen) * 0.12;
    const uDir = [
      (BR[0] - BL[0]) / uLen,
      (BR[1] - BL[1]) / uLen,
      (BR[2] - BL[2]) / uLen,
    ];
    const vDir = [
      (TL[0] - BL[0]) / vLen,
      (TL[1] - BL[1]) / vLen,
      (TL[2] - BL[2]) / vLen,
    ];

    // Inner corners
    const iBL = [
      BL[0] + uDir[0] * t + vDir[0] * t,
      BL[1] + uDir[1] * t + vDir[1] * t,
      BL[2] + uDir[2] * t + vDir[2] * t,
    ];
    const iTL = [
      TL[0] + uDir[0] * t - vDir[0] * t,
      TL[1] + uDir[1] * t - vDir[1] * t,
      TL[2] + uDir[2] * t - vDir[2] * t,
    ];
    const iBR = [
      BR[0] - uDir[0] * t + vDir[0] * t,
      BR[1] - uDir[1] * t + vDir[1] * t,
      BR[2] - uDir[2] * t + vDir[2] * t,
    ];
    const iTR = [
      TR[0] - uDir[0] * t - vDir[0] * t,
      TR[1] - uDir[1] * t - vDir[1] * t,
      TR[2] - uDir[2] * t - vDir[2] * t,
    ];

    // 4 border strips (each = 2 triangles = 6 vertices)
    const borderVertices = [
      ...BL,
      ...iBL,
      ...BR,
      ...BR,
      ...iBL,
      ...iBR, // Bottom
      ...iTL,
      ...TL,
      ...iTR,
      ...iTR,
      ...TL,
      ...TR, // Top
      ...BL,
      ...TL,
      ...iBL,
      ...iBL,
      ...TL,
      ...iTL, // Left
      ...iBR,
      ...iTR,
      ...BR,
      ...BR,
      ...iTR,
      ...TR, // Right
    ];
    const transform = mesh.getParent()?.getTransformMatrix() || identityM44();
    const rotation: M44 = [
      transform[0],
      transform[1],
      transform[2],
      0,
      transform[4],
      transform[5],
      transform[6],
      0,
      transform[8],
      transform[9],
      transform[10],
      0,
      0,
      0,
      0,
      1,
    ];
    const worldNormal = multiplyM4V3(rotation, normal as V3);
    for (let i = 0; i < borderVertices.length; i += 3) {
      const p = multiplyM4V3(transform, [
        borderVertices[i],
        borderVertices[i + 1],
        borderVertices[i + 2],
      ]);
      outVertices.push(p[0], p[1], p[2]);
      outNormals.push(worldNormal[0], worldNormal[1], worldNormal[2]);
    }
  }
}

