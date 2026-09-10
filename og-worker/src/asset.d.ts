declare module "*.wasm" {
  // Wrangler's esbuild pre-compiles wasm imports into a WebAssembly.Module.
  const wasmModule: WebAssemblyModule
  export default wasmModule
}

declare module "*.ttf" {
  const fontData: Uint8Array
  export default fontData
}

// Workers runtime provides these at runtime; the typed package predates them.
declare type WebAssemblyModule = unknown
declare function createImageBitmap(
  blob: Blob,
  options?: { resizeWidth?: number; resizeHeight?: number },
): Promise<ImageBitmap>
declare type OffscreenCanvas = {
  width: number
  height: number
  getContext(contextId: "2d"): OffscreenCanvasRenderingContext2D
  getContext(contextId: "webgl"): WebGLRenderingContext
}
declare type OffscreenCanvasRenderingContext2D = {
  drawImage(image: ImageBitmap, dx: number, dy: number): void
  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData
}
declare var OffscreenCanvas: {
  prototype: OffscreenCanvas
  new (width: number, height: number): OffscreenCanvas
}
