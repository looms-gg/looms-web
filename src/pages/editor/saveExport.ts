import { downloadFile } from "../../editor/core/downloadFile";
import type { Group, Slot } from "../../data/catalog";

export function hasPaintedPixelsData(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return true;
  }
  return false;
}

export function hasPaintedPixels(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return hasPaintedPixelsData(data);
}

/**
 * Prefill for the upload form's slot picker, derived from which body regions
 * the layer paints. The picker stays editable; this only suggests a start.
 */
export function suggestSlot(painted: Group[]): Slot {
  const hasTorso = painted.includes("torso");
  const hasLegs = painted.includes("legs");
  if (hasTorso && hasLegs) return "set";
  if (painted.includes("head")) return "hair";
  if (hasTorso) return "shirt";
  if (hasLegs) return "pants";
  return "shirt";
}

const EXPORT_LABELS = {
  title: "Save layer",
  instruction: "Press and hold the image, then tap Save.",
  done: "Done",
  cannotExportTitle: "Can't export layer",
  cannotExportMessage: "Garment layers can't be exported from this browser.",
};

export function exportGarmentPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  downloadFile(
    canvas.toDataURL("image/png"),
    `${filename}.png`,
    EXPORT_LABELS,
  ).catch(() => {});
}
