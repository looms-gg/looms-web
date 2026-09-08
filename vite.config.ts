import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig(({ command }) => ({
  // Dev stays at `/`. Production defaults to project Pages path unless VITE_BASE is set.
  base: process.env.VITE_BASE ?? (command === "build" ? "/looms-web/" : "/"),
  plugins: [tailwindcss(), react()],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setupCatalog.ts"],
  },
}))
