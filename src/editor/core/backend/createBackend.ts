// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.

import type { Backend } from "./Backend";
import { BackendNotSupportedError } from "../errors";
import Webgl1Backend from "./Webgl1Backend";
import Webgl2Backend from "./Webgl2Backend";

export async function createBackend(
  canvas: HTMLCanvasElement,
): Promise<Backend> {
  try {
    return new Webgl2Backend(canvas);
  } catch {
    // WebGL2 not available, fall back to WebGL1
  }

  try {
    return new Webgl1Backend(canvas);
  } catch {
    // WebGL1 not available either
  }

  throw new BackendNotSupportedError();
}
