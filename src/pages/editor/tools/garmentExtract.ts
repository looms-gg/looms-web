export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const clean = filename.trim().replace(/\.png$/i, "") || "my-skin"
  const a = document.createElement("a")
  a.href = canvas.toDataURL("image/png")
  a.download = `${clean}.png`
  a.click()
}

