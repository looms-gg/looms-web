export function makeSkinCanvas() {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2d canvas unavailable")
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 64, 64)
  return { canvas, ctx }
}
