// Skin editor stage on skinview3d: the same renderer the Studio page uses.
// Replaces the ported MineSkin WebGL engine for display, picking, and camera
// control; the store, brush tools, and save flows stay as they are.
import {
  type Intersection,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Raycaster,
  RingGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type MeshStandardMaterial,
} from "three";
import { SkinViewer, PlayerObject } from "skinview3d";
import {
  getRendererState,
  subscribeToRenderer,
  type RendererStore,
} from "../store";
import type { Parts } from "../types";
import { mirrorSkinTexel } from "../core/skinMirror";
import {
  hexToRgb,
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
} from "../color/colorUtils";
import { MAX_VARIATION_STEPS, randomInRange } from "../core/utils";
import { bodies, DEFAULT_BODY_ID } from "../../data/bodies";
import {
  crispSkinTexture,
  lightSkinViewer,
} from "../../skin/focus";


const ATLAS = 64;

// Mirror of the Studio's flat skin material recipe (src/skin/materials.ts)
// applied to a standalone player object, with extra polygon-offset depth
// bias so the guide never z-fights the coplanar garment.
const GUIDE_DEPTH_BIAS = 2;

function flattenGuideMaterials(player: PlayerObject) {
  const map = player.skin.map;
  const skin = player.skin as unknown as Record<
    string,
    MeshStandardMaterial | undefined
  >;
  for (const name of [
    "layer1Material",
    "layer1MaterialBiased",
    "layer2Material",
    "layer2MaterialBiased",
  ]) {
    const material = skin[name];
    if (!material) continue;
    material.roughness = 0.82;
    material.metalness = 0;
    material.flatShading = true;
    material.transparent = true;
    material.alphaTest = 1 / 255;
    material.depthWrite = true;
    material.toneMapped = false;
    material.side = DoubleSide;
    material.polygonOffset = true;
    material.polygonOffsetFactor = GUIDE_DEPTH_BIAS;
    material.polygonOffsetUnits = GUIDE_DEPTH_BIAS;
    material.map = map;
    material.needsUpdate = true;
  }
}

// Shading snaps to the same HSV lattice MineSkin used: whole 5% brightness
// rungs with coarse hue/saturation rounding, so repeated strokes reuse a
// small ladder of shades per base color.
const SHADE_VALUE_STEP = 5;
const SHADE_HUE_STEP = 4;
const SHADE_SAT_STEP = 4;

type Texel = { u: number; v: number };
type FaceBounds = { minU: number; minV: number; maxU: number; maxV: number };
type SkinHit = {
  texel: Texel;
  point: Vector3;
  normal: Vector3;
  faceBounds: FaceBounds;
};

function clampTexel(t: number): number {
  return Math.min(ATLAS - 1, Math.max(0, t));
}

export class SkinEditorStage {
  readonly viewer: SkinViewer;
  private guidePlayer: PlayerObject | null = null;
  private raycaster = new Raycaster();
  private hoverRing: Mesh | null = null;
  private unsubscribe: (() => void) | null = null;
  private disposed = false;

  // Paint gesture state
  private isDrawing = false;
  private handedOffToOrbit = false;
  private lastGuideBodyId: string | null = null;
  private lastOrbitPos: { x: number; y: number } | null = null;
  private boundPointerDown = this.onPointerDown.bind(this);
  private boundPointerMove = this.onPointerMove.bind(this);
  private boundPointerUp = this.onPointerUp.bind(this);
  private resizeObserver: ResizeObserver | null = null;

  private canvas: HTMLCanvasElement;
  private wrapper: HTMLElement;

  constructor(canvas: HTMLCanvasElement, wrapper: HTMLElement) {
    this.canvas = canvas;
    this.wrapper = wrapper;
    this.viewer = new SkinViewer({ canvas });
    this.viewer.controls.enablePan = false;
    this.viewer.autoRotate = false;
    // The Studio's exact look: no FXAA soft pass, no tone mapping, the
    // key/fill/rim light rig, and flat unshaded skin materials.
    lightSkinViewer(this.viewer);

    // skinview3d does not auto-resize: track the canvas box ourselves.
    this.resizeObserver = new ResizeObserver(() => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width > 0 && height > 0) this.viewer.setSize(width, height);
    });
    this.resizeObserver.observe(canvas);

    void this.attachGuideBody();
    this.viewer.loadSkin(this.blankSkinCanvas(), { model: "default" });
    crispSkinTexture(this.viewer);

    this.pushInitialSnapshot();
    this.mountGestures();
    this.mountStoreSubscription();
  }

  private blankSkinCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS;
    canvas.height = ATLAS;
    canvas.getContext("2d")!.clearRect(0, 0, ATLAS, ATLAS);
    return canvas;
  }

  private get skinCtx(): CanvasRenderingContext2D {
    return this.viewer.skinCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;
  }

  private markTextureDirty() {
    const texture = this.viewer.playerObject.skin.map;
    if (texture) texture.needsUpdate = true;
  }

  // ---------------------------------------------------------------- guide

  private async attachGuideBody() {
    const state = getRendererState();
    const body =
      bodies.find((b) => b.id === state.guideBodyId) ??
      bodies.find((b) => b.id === DEFAULT_BODY_ID);
    if (!body) return;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = body.skin;
    });
    if (this.disposed) return;
    const guideCanvas = document.createElement("canvas");
    guideCanvas.width = ATLAS;
    guideCanvas.height = ATLAS;
    guideCanvas.getContext("2d")!.drawImage(img, 0, 0, ATLAS, ATLAS);
    const guide = new PlayerObject();
    guide.name = "guideBody";
    guide.cape.visible = false;
    guide.ears.visible = false;
    const guideTexture = new CanvasTexture(guideCanvas);
    guideTexture.magFilter = NearestFilter;
    guideTexture.minFilter = NearestFilter;
    guideTexture.colorSpace = SRGBColorSpace;
    guideTexture.generateMipmaps = false;
    guide.skin.map = guideTexture;
    guide.skin.modelType = "default";
    guide.skin.visible = true;
    // The Studio's flat material recipe, with extra depth bias so the
    // guide never z-fights the coplanar garment.
    flattenGuideMaterials(guide);
    this.guidePlayer = guide;
    this.viewer.playerWrapper.add(guide);
    this.applyGuideVisibility();
    for (const part of Object.keys(this.guidePartsVisible) as Parts[]) {
      this.applyGuidePartVisibility(part);
    }
  }

  private guidePartsVisible: Partial<Record<Parts, boolean>> = {};

  private applyGuideVisibility() {
    if (this.guidePlayer) {
      this.guidePlayer.visible = getRendererState().guideBodyVisible;
    }
  }

  setGuidePartVisible(part: Parts, visible: boolean) {
    this.guidePartsVisible[part] = visible;
    this.applyGuidePartVisibility(part);
  }

  private applyGuidePartVisibility(part: Parts) {
    const guide = this.guidePlayer;
    if (!guide) return;
    const visible = this.guidePartsVisible[part] ?? true;
    const { skin } = guide;
    if (part === "head") skin.head.visible = visible;
    else if (part === "body") skin.body.visible = visible;
    else if (part === "leftArm") skin.leftArm.visible = visible;
    else if (part === "rightArm") skin.rightArm.visible = visible;
    else if (part === "leftLeg") skin.leftLeg.visible = visible;
    else if (part === "rightLeg") skin.rightLeg.visible = visible;
  }

  private async rebuildGuideBody() {
    if (this.guidePlayer) {
      this.viewer.playerWrapper.remove(this.guidePlayer);
      this.guidePlayer = null;
    }
    await this.attachGuideBody();
    this.applyGuideVisibility();
  }

  // -------------------------------------------------------------- picking

  private raycast(clientX: number, clientY: number): SkinHit | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const garment = this.viewer.playerObject;
    if (!garment.skin.visible) return null;
    this.raycaster.setFromCamera(
      new Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.viewer.camera,
    );
    const hit = this.raycaster
      .intersectObject(garment, true)
      .find((entry) => entry.object.visible && entry.uv);
    if (!hit || !hit.uv || !hit.face) return null;
    return {
      texel: {
        u: clampTexel(Math.floor(hit.uv.x * ATLAS)),
        v: clampTexel(Math.floor((1 - hit.uv.y) * ATLAS)),
      },
      point: hit.point,
      normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld),
      faceBounds: this.faceBoundsFromHit(hit),
    };
  }

  // Box geometry packs four vertices + six indices per face, so the two
  // triangles of one face span indices [quad*6, quad*6+6).
  private faceBoundsFromHit(hit: Intersection): FaceBounds {
    const geometry = (hit.object as Mesh)
      .geometry as import("three").BoxGeometry;
    const uvAttr = geometry.attributes.uv;
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    const quad = Math.floor((hit.faceIndex ?? 0) / 2);
    const indices = geometry.index?.array;
    const read = (vertex: number) => {
      const u = uvAttr.array[vertex * 2];
      const v = uvAttr.array[vertex * 2 + 1];
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    };
    if (indices) {
      for (let i = quad * 6; i < quad * 6 + 6; i++) read(indices[i]);
    } else {
      for (let i = quad * 4; i < quad * 4 + 4; i++) read(i);
    }
    return {
      minU: Math.max(0, Math.floor(minU * ATLAS)),
      minV: Math.max(0, Math.floor(minV * ATLAS)),
      maxU: Math.min(ATLAS, Math.ceil(maxU * ATLAS)),
      maxV: Math.min(ATLAS, Math.ceil(maxV * ATLAS)),
    };
  }

  // ---------------------------------------------------------------- paint

  private paintTargets(u: number, v: number): Texel[] {
    const state = getRendererState();
    if (!state.mirrorPaint) return [{ u, v }];
    const mirrored = mirrorSkinTexel(u, v, {
      scale: 1,
      slim: state.skinIsSlim,
    });
    if (!mirrored || (mirrored.u === u && mirrored.v === v)) return [{ u, v }];
    return [{ u, v }, mirrored];
  }

  private fillTexel(u: number, v: number, color: string, alpha: number) {
    const ctx = this.skinCtx;
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const { r, g, b } = rgb;
    // Minecraft reads the texel's final alpha, so repainting a texel with
    // lower opacity must replace, not blend with, what was there.
    ctx.clearRect(u, v, 1, 1);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha / 255})`;
    ctx.fillRect(u, v, 1, 1);
  }

  private paintAt(texel: Texel, hit: SkinHit) {
    const state = getRendererState();
    if (state.paintMode === "eraser") {
      this.eraseAt(texel, hit);
    } else if (state.paintMode === "variation") {
      this.variateAt(texel);
    } else if (state.paintMode === "dither") {
      this.ditherAt(texel);
    } else {
      for (const t of this.paintTargets(texel.u, texel.v)) {
        this.fillTexel(t.u, t.v, state.paintColor, state.paintAlpha);
      }
    }
  }

  private eraseAt(texel: Texel, hit: SkinHit) {
    const radius = getRendererState().eraserRadius;
    const { u: hu, v: hv } = texel;
    const { faceBounds: bounds } = hit;
    const minU = Math.max(bounds.minU, hu - radius);
    const maxU = Math.min(bounds.maxU, hu + radius + 1);
    const minV = Math.max(bounds.minV, hv - radius);
    const maxV = Math.min(bounds.maxV, hv + radius + 1);
    const r2 = (radius + 0.5) * (radius + 0.5);
    for (let v = minV; v < maxV; v++) {
      for (let u = minU; u < maxU; u++) {
        const du = u - hu;
        const dv = v - hv;
        if (radius === 0 || du * du + dv * dv <= r2) {
          for (const t of this.paintTargets(u, v)) {
            this.skinCtx.clearRect(t.u, t.v, 1, 1);
          }
        }
      }
    }
  }

  private fillFace(texel: Texel, hit: SkinHit) {
    const state = getRendererState();
    const { faceBounds: bounds } = hit;
    const radius = state.bulkPaintRadius;
    if (radius > 0) {
      const isCircle = state.bulkPaintShape === "circle";
      const hu = texel.u;
      const hv = texel.v;
      const r2 = (radius + 0.5) * (radius + 0.5);
      for (let v = bounds.minV; v < bounds.maxV; v++) {
        for (let u = bounds.minU; u < bounds.maxU; u++) {
          const du = u - hu;
          const dv = v - hv;
          const inside = isCircle
            ? du * du + dv * dv <= r2
            : Math.abs(du) <= radius && Math.abs(dv) <= radius;
          if (inside) {
            for (const t of this.paintTargets(u, v)) {
              this.fillTexel(t.u, t.v, state.paintColor, state.paintAlpha);
            }
          }
        }
      }
      return;
    }
    for (let v = bounds.minV; v < bounds.maxV; v++) {
      for (let u = bounds.minU; u < bounds.maxU; u++) {
        for (const t of this.paintTargets(u, v)) {
          this.fillTexel(t.u, t.v, state.paintColor, state.paintAlpha);
        }
      }
    }
  }

  private variateAt(texel: Texel) {
    const state = getRendererState();
    const maxSteps = Math.min(
      MAX_VARIATION_STEPS,
      Math.max(1, Math.round(state.variationIntensity)),
    );
    const { u, v } = texel;
    const data = this.skinCtx.getImageData(u, v, 1, 1).data;
    const alpha = data[3];
    if (alpha === 0) {
      for (const t of this.paintTargets(u, v)) {
        this.fillTexel(t.u, t.v, state.paintColor, state.paintAlpha);
      }
      return;
    }
    const hsv = rgbToHsv(data[0], data[1], data[2]);
    const steps = 1 + Math.floor(randomInRange(0, maxSteps));
    const direction = randomInRange(-1, 1) < 0 ? -1 : 1;
    const value = Math.min(
      100,
      Math.max(
        0,
        Math.round((hsv.v + direction * steps * SHADE_VALUE_STEP) / SHADE_VALUE_STEP) *
          SHADE_VALUE_STEP,
      ),
    );
    const hue = (Math.round(hsv.h / SHADE_HUE_STEP) * SHADE_HUE_STEP) % 360;
    const sat = Math.min(
      100,
      Math.round(hsv.s / SHADE_SAT_STEP) * SHADE_SAT_STEP,
    );
    const rgb = hsvToRgb(hue, sat, value);
    for (const t of this.paintTargets(u, v)) {
      this.fillTexel(t.u, t.v, rgbToHex(rgb.r, rgb.g, rgb.b), alpha);
    }
  }

  private ditherAt(texel: Texel) {
    const state = getRendererState();
    const { u, v } = texel;
    if ((u + v) % 2 !== 0) return;
    for (const t of this.paintTargets(u, v)) {
      this.fillTexel(t.u, t.v, state.paintColor, state.paintAlpha);
    }
  }

  pickColor(clientX: number, clientY: number): string | null {
    const hit = this.raycast(clientX, clientY);
    if (!hit) return null;
    const data = this.skinCtx.getImageData(hit.texel.u, hit.texel.v, 1, 1).data;
    if (data[3] === 0) return null;
    return rgbToHex(data[0], data[1], data[2]);
  }

  // ------------------------------------------------------------- gestures

  private onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const state = getRendererState();
    if (state.colorPickerActive) {
      const hex = this.pickColor(e.clientX, e.clientY);
      if (hex) {
        state.setValue("paintColor", hex);
        state.setValue("colorPickerActive", false);
      }
      return;
    }
    const hit = this.raycast(e.clientX, e.clientY);
    if (!hit) return;
    // Paint owns the gesture: claim it in the capture phase so OrbitControls
    // (registered on the canvas itself) never starts a camera drag.
    this.viewer.controls.enabled = false;
    e.stopPropagation();
    e.preventDefault();
    this.isDrawing = true;
    this.beginBatch();
    this.applyPaint(hit);
  }

  private applyPaint(hit: SkinHit) {
    const state = getRendererState();
    if (state.paintMode === "bulk") {
      this.fillFace(hit.texel, hit);
    } else {
      this.paintAt(hit.texel, hit);
    }
    this.markTextureDirty();
  }

  private onPointerMove(e: PointerEvent) {
    if (this.handedOffToOrbit) {
      this.rotateCameraByClientDelta(e.clientX, e.clientY);
      return;
    }
    if (!this.isDrawing) {
      this.updateHover(e.clientX, e.clientY);
      return;
    }
    const hit = this.raycast(e.clientX, e.clientY);
    if (!hit) {
      // The stroke left the model: end the batch and hand the remaining drag
      // to the camera, exactly like a drag that started on the background.
      this.endStroke();
      this.handedOffToOrbit = true;
      this.lastOrbitPos = { x: e.clientX, y: e.clientY };
      this.viewer.controls.enabled = true;
      this.hideHover();
      return;
    }
    this.applyPaint(hit);
  }

  private onPointerUp() {
    if (this.isDrawing) this.endStroke();
    this.handedOffToOrbit = false;
    this.lastOrbitPos = null;
    this.viewer.controls.enabled = true;
  }

  private endStroke() {
    this.isDrawing = false;
    this.endBatch();
    this.canvas.style.cursor = "grab";
  }

  private mountGestures() {
    // Capture phase on the wrapper: these run before the canvas-target
    // listeners OrbitControls registered at construction.
    this.wrapper.addEventListener("pointerdown", this.boundPointerDown, true);
    window.addEventListener("pointermove", this.boundPointerMove, true);
    window.addEventListener("pointerup", this.boundPointerUp, true);
    window.addEventListener("pointercancel", this.boundPointerUp, true);
  }

  // -------------------------------------------------------------- hover

  private updateHover(clientX: number, clientY: number) {
    const hit = this.raycast(clientX, clientY);
    this.canvas.style.cursor = hit ? "crosshair" : "grab";
    if (!hit) {
      this.hideHover();
      return;
    }
    if (!this.hoverRing) {
      this.hoverRing = new Mesh(
        new RingGeometry(0.3, 0.42, 24),
        new MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
          depthTest: false,
        }),
      );
      this.hoverRing.renderOrder = 999;
      this.viewer.scene.add(this.hoverRing);
    }
    this.hoverRing.visible = true;
    this.hoverRing.position.copy(hit.point).addScaledVector(hit.normal, 0.08);
    this.hoverRing.lookAt(
      hit.point.clone().addScaledVector(hit.normal, 1),
    );
  }

  private hideHover() {
    if (this.hoverRing) this.hoverRing.visible = false;
  }

  // -------------------------------------------------------------- camera

  private rotateCameraByClientDelta(clientX: number, clientY: number) {
    const dx = this.lastOrbitPos ? clientX - this.lastOrbitPos.x : 0;
    const dy = this.lastOrbitPos ? clientY - this.lastOrbitPos.y : 0;
    this.lastOrbitPos = { x: clientX, y: clientY };
    this.rotateCameraByDelta(dx, dy);
  }

  private rotateCameraByDelta(dx: number, dy: number) {
    const camera = this.viewer.camera;
    const target = new Vector3(0, 0, 0);
    const offset = camera.position.clone().sub(target);
    const radius = offset.length();
    const theta = Math.atan2(offset.x, offset.z) - dx * 0.01;
    let phi = Math.acos(Math.min(1, Math.max(-1, offset.y / radius))) - dy * 0.01;
    phi = Math.min(Math.PI - 0.01, Math.max(0.01, phi));
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(target);
  }

  /** Frame a part: the Head / Body / Legs pill presets. */
  framePreset(preset: "head" | "body" | "legs") {
    const state = getRendererState();
    const fovRad = state.cameraFieldOfView;
    const radiusFactor = state.cameraRadius / 35;
    const distance = Math.min(
      256,
      Math.max(10, 4.5 + 16.5 / Math.tan(fovRad / 2) / (radiusFactor || 1)),
    );
    // cameraPhi is the elevation: positive looks down from above.
    const phi = preset === "head" ? 0.5 : preset === "legs" ? 0.75 : 0;
    const theta = -state.cameraTheta;
    const polar = Math.PI / 2 - phi;
    this.viewer.camera.position.set(
      distance * Math.sin(polar) * Math.sin(theta),
      distance * Math.cos(polar),
      distance * Math.sin(polar) * Math.cos(theta),
    );
    this.viewer.camera.lookAt(0, 0, 0);
  }

  // ----------------------------------------------------------------- undo

  private beginBatch() {
    const state = getRendererState();
    state.beginBatch(this.readImageData(), state.skinIsSlim);
  }

  private endBatch() {
    const state = getRendererState();
    state.endBatch(this.readImageData(), state.skinIsSlim);
  }

  private pushInitialSnapshot() {
    getRendererState().pushToUndoStack({
      imageData: this.readImageData(),
      skinIsSlim: getRendererState().skinIsSlim,
    });
  }

  private readImageData(): ImageData {
    const canvas = this.viewer.skinCanvas;
    return this.skinCtx.getImageData(0, 0, canvas.width, canvas.height);
  }

  applySnapshot(imageData: ImageData) {
    this.skinCtx.putImageData(imageData, 0, 0);
    this.markTextureDirty();
  }

  undo(): void {
    const prev = getRendererState().undo();
    if (prev) this.applySnapshot(prev.imageData);
  }

  redo(): void {
    const next = getRendererState().redo();
    if (next) this.applySnapshot(next.imageData);
  }

  clearHistory(): void {
    getRendererState().clearHistory();
    this.pushInitialSnapshot();
  }

  // ------------------------------------------------------------ store sync

  private mountStoreSubscription() {
    this.unsubscribe = subscribeToRenderer((state, prevState) => {
      if (state.skinIsSlim !== prevState.skinIsSlim) {
        this.viewer.playerObject.skin.modelType = state.skinIsSlim
          ? "slim"
          : "default";
      }
      if (
        state.guideBodyVisible !== prevState.guideBodyVisible ||
        state.guideBodyId !== prevState.guideBodyId
      ) {
        if (state.guideBodyId !== this.lastGuideBodyId) {
          this.lastGuideBodyId = state.guideBodyId;
          void this.rebuildGuideBody();
        } else {
          this.applyGuideVisibility();
        }
      }
      if (this.garmentVisibilityChanged(state, prevState)) {
        this.applyGarmentVisibility(state);
      }
      if (state.ambientLight !== prevState.ambientLight) {
        this.viewer.globalLight.intensity = 1.15 * state.ambientLight;
      }
      if (
        state.directionalLightIntensity !==
        prevState.directionalLightIntensity
      ) {
        this.viewer.cameraLight.intensity =
          0.35 * (state.directionalLightIntensity / 0.3);
      }
      if (state.cameraFieldOfView !== prevState.cameraFieldOfView) {
        this.viewer.fov = (state.cameraFieldOfView * 180) / Math.PI;
      }
      if (
        state.cameraPhi !== prevState.cameraPhi ||
        state.cameraTheta !== prevState.cameraTheta ||
        state.cameraRadius !== prevState.cameraRadius
      ) {
        this.applyStoreCamera(state);
      }
    });
    this.applyGarmentVisibility(getRendererState());
    this.viewer.globalLight.intensity =
      1.15 * getRendererState().ambientLight;
    this.viewer.cameraLight.intensity =
      0.35 * (getRendererState().directionalLightIntensity / 0.3);
    this.viewer.fov = (getRendererState().cameraFieldOfView * 180) / Math.PI;
  }

  private garmentVisibilityChanged(
    state: RendererStore,
    prevState: RendererStore,
  ): boolean {
    return (
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

  private applyGarmentVisibility(state: RendererStore) {
    const skin = this.viewer.playerObject.skin;
    skin.head.visible = state.baseheadVisible || state.overlayheadVisible;
    skin.head.innerLayer.visible = state.baseheadVisible;
    skin.head.outerLayer.visible = state.overlayheadVisible;
    skin.body.visible = state.basebodyVisible || state.overlaybodyVisible;
    skin.body.innerLayer.visible = state.basebodyVisible;
    skin.body.outerLayer.visible = state.overlaybodyVisible;
    skin.leftArm.visible =
      state.baseleftArmVisible || state.overlayleftArmVisible;
    skin.leftArm.innerLayer.visible = state.baseleftArmVisible;
    skin.leftArm.outerLayer.visible = state.overlayleftArmVisible;
    skin.rightArm.visible =
      state.baserightArmVisible || state.overlayrightArmVisible;
    skin.rightArm.innerLayer.visible = state.baserightArmVisible;
    skin.rightArm.outerLayer.visible = state.overlayrightArmVisible;
    skin.leftLeg.visible =
      state.baseleftLegVisible || state.overlayleftLegVisible;
    skin.leftLeg.innerLayer.visible = state.baseleftLegVisible;
    skin.leftLeg.outerLayer.visible = state.overlayleftLegVisible;
    skin.rightLeg.visible =
      state.baserightLegVisible || state.overlayrightLegVisible;
    skin.rightLeg.innerLayer.visible = state.baserightLegVisible;
    skin.rightLeg.outerLayer.visible = state.overlayrightLegVisible;
  }

  private applyStoreCamera(state: RendererStore) {
    const fovRad = state.cameraFieldOfView;
    const distance = Math.min(
      256,
      Math.max(10, 4.5 + 16.5 / Math.tan(fovRad / 2) / (state.cameraRadius / 35 || 1)),
    );
    const theta = -state.cameraTheta;
    const polar = Math.PI / 2 - state.cameraPhi;
    this.viewer.camera.position.set(
      distance * Math.sin(polar) * Math.sin(theta),
      distance * Math.cos(polar),
      distance * Math.sin(polar) * Math.cos(theta),
    );
    this.viewer.camera.lookAt(0, 0, 0);
  }

  // ----------------------------------------------------------------- misc

  getTextureCanvas(): HTMLCanvasElement | null {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS;
    canvas.height = ATLAS;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(this.viewer.skinCanvas, 0, 0);
    return canvas;
  }

  dispose() {
    this.disposed = true;
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.wrapper.removeEventListener(
      "pointerdown",
      this.boundPointerDown,
      true,
    );
    window.removeEventListener("pointermove", this.boundPointerMove, true);
    window.removeEventListener("pointerup", this.boundPointerUp, true);
    window.removeEventListener("pointercancel", this.boundPointerUp, true);
    this.viewer.dispose();
  }
}
