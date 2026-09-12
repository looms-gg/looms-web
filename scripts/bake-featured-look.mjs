#!/usr/bin/env node
/**
 * Bakes the current #1 look on looms.gg into the home/social preview.
 *
 * Build-time pipeline:
 *   1. Ask the database for the top trending public look (falls back to
 *      yesterday's crown). No look or no credentials → leave the committed
 *      card untouched and exit cleanly.
 *   2. Boot a short-lived Vite dev server and render that look's 3D isometric
 *      preview with the real skin engine in headless Chromium.
 *   3. Write the render to public/iso/pieces/__featured_outfit.png plus a
 *      sidecar JSON, which scripts/generate-og-assets.py turns into
 *      public/og/outfit-default.png (the og:image / twitter:image).
 *
 * The step is best-effort by design: a browser or network failure must never
 * block a deploy, it just keeps the last committed preview.
 */

import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

function log(message) {
  console.log(`[featured-og] ${message}`)
}

function warn(message) {
  console.warn(`[featured-og] ${message}`)
}

function parseEnvFile(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[match[1]] = value
  }
  return out
}

function loadSupabaseEnv() {
  const env = {
    ...parseEnvFile(path.join(ROOT, ".env")),
    ...parseEnvFile(path.join(ROOT, ".env.local")),
    ...process.env,
  }
  return {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  }
}

async function rpc(url, anonKey, fn, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    throw new Error(`rpc ${fn} failed (${res.status})`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function fetchTopLook(url, anonKey) {
  const trending = await rpc(url, anonKey, "get_trending_looks_past_day", { p_limit: 1 })
  if (trending[0]) return trending[0]
  const crowned = await rpc(url, anonKey, "get_yesterday_top_look", {})
  return crowned[0] ?? null
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

function writePng(dataUrl, outPath) {
  const match = /^data:image\/png;base64,(.*)$/s.exec(dataUrl)
  if (!match) throw new Error("render did not return a PNG data URL")
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, Buffer.from(match[1], "base64"))
}

async function main() {
  const { url, anonKey } = loadSupabaseEnv()
  if (!url || !anonKey) {
    warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — keeping committed preview")
    return
  }

  let look
  try {
    look = await fetchTopLook(url, anonKey)
  } catch (err) {
    warn(`could not fetch #1 look (${err.message}) — keeping committed preview`)
    return
  }
  if (!look || !Array.isArray(look.stack) || look.stack.length === 0) {
    warn("no public #1 look found — keeping committed preview")
    return
  }

  const port = await freePort()
  let server
  let browser
  try {
    const { createServer } = await import("vite")
    const { chromium } = await import("playwright")

    server = await createServer({
      root: ROOT,
      logLevel: "error",
      server: { host: "127.0.0.1", port, strictPort: true },
    })
    await server.listen()
    const base = server.resolvedUrls?.local?.[0]
    if (!base) throw new Error("vite dev server did not report a local URL")

    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.addInitScript((payload) => {
      window.__FEATURED_LOOK__ = payload
    }, {
      id: look.id,
      stack: look.stack,
      bodyId: look.body_id,
      bodyHue: look.body_hue,
      model: look.model,
    })

    await page.goto(new URL("scripts/render-featured-look.html", base).toString(), {
      waitUntil: "domcontentloaded",
    })
    await page.waitForFunction(
      () => window.__FEATURED_RESULT__ || document.title === "RENDER_FAILED",
      { timeout: 90_000 },
    )

    const failed = await page.evaluate(() => document.title === "RENDER_FAILED")
    if (failed) {
      const detail = await page.evaluate(() => document.getElementById("out")?.textContent ?? "")
      throw new Error(detail || "render page failed")
    }

    const result = await page.evaluate(() => window.__FEATURED_RESULT__)
    if (!result?.url) throw new Error("render produced no image")

    const isoDir = path.join(ROOT, "public", "iso", "pieces")
    const isoPath = path.join(isoDir, "__featured_outfit.png")
    writePng(result.url, isoPath)
    fs.writeFileSync(
      path.join(isoDir, "__featured_outfit.json"),
      JSON.stringify(
        {
          id: look.id,
          wash: result.wash || "oklch(0.91 0.05 320)",
          name: look.name || "Community look",
          description: look.description || "",
          maker: look.username || "",
          layers: result.layers ?? look.stack.length,
        },
        null,
        2,
      ),
    )

    log(`baked "${look.name}" (${result.layers} layers) into __featured_outfit.png`)
  } catch (err) {
    warn(`${err.message} — keeping committed preview`)
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (server) await server.close().catch(() => {})
  }
}

main().catch((err) => {
  warn(`${err instanceof Error ? err.message : err} — keeping committed preview`)
})
