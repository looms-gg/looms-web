import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(() => ({
  // Served at root via custom domain (looms.gg). Override with VITE_BASE for
  // project-Pages builds (e.g. /looms-web/).
  base: process.env.VITE_BASE ?? "/",
  plugins: [tailwindcss(), react()],
  test: {
    environment: "happy-dom",
    // scripts/ holds the prerender-contract test guarding the built HTML.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    setupFiles: ["src/test/setupCatalog.ts"],
  },
}))
