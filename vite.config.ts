import fs from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

function isoSaverPlugin(): Plugin {
  return {
    name: "iso-saver",
    configureServer(server) {
      server.middlewares.use("/api/save-iso-renders", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          return res.end("method not allowed")
        }
        let body = ""
        req.on("data", (chunk) => {
          body += chunk
        })
        req.on("end", () => {
          try {
            const data = JSON.parse(body) as Record<string, { url: string; wash: string }>
            const outDir = path.resolve(process.cwd(), "public/iso/pieces")
            fs.mkdirSync(outDir, { recursive: true })

            for (const [id, item] of Object.entries(data)) {
              if (!item.url?.startsWith("data:image/png;base64,")) continue
              const base64 = item.url.replace(/^data:image\/png;base64,/, "")
              fs.writeFileSync(path.join(outDir, `${id}.png`), Buffer.from(base64, "base64"))
              fs.writeFileSync(
                path.join(outDir, `${id}.json`),
                JSON.stringify({ id, wash: item.wash }, null, 2),
              )
            }
            res.statusCode = 200
            res.end(JSON.stringify({ ok: true, count: Object.keys(data).length }))
          } catch (e) {
            res.statusCode = 500
            res.end(String(e))
          }
        })
      })
    },
  }
}

export default defineConfig(() => ({
  // Served at root via custom domain (looms.gg). Override with VITE_BASE for
  // project-Pages builds (e.g. /looms-web/).
  base: process.env.VITE_BASE ?? "/",
  plugins: [tailwindcss(), react(), isoSaverPlugin()],
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setupCatalog.ts"],
  },
}))
