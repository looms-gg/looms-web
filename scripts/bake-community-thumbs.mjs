#!/usr/bin/env node
/**
 * One-time operator bake: renders thumbnails for every public community
 * garment that lacks one, uploads them next to their textures in the live
 * `garments` bucket, and sets garments.thumb_url on the live database.
 *
 * Unlike bake-catalog-thumbs.mjs the source textures are NOT seed assets —
 * they are the community uploads already in Supabase, so the render page
 * fetches each row's texture_url straight from the public bucket.
 *
 * Steps:
 *   1. `supabase db query --linked` for public garments where thumb_url is null.
 *      Empty list exits 0 with a "nothing to backfill" message — that is a
 *      legitimate outcome, not an error.
 *   2. Boot a short-lived Vite dev server and render each texture with the
 *      real skin engine in headless Chromium (scripts/render-community-thumbs.html).
 *   3. Stage PNGs locally as {userId}/{pieceId}.thumb.png and upload with the
 *      CLI's service-role path (`--experimental storage cp`), file by file:
 *      these garments belong to many users, so path-scoped storage policies
 *      would reject any anon/authenticated-client upload by design.
 *      cacheControl IS settable via the CLI flag (31536000, matching
 *      bakeAndUploadThumb), so no cache limitation applies.
 *   4. Update thumb_url in ONE SQL pass scoped to the ids actually baked,
 *      building the public storage base from VITE_SUPABASE_URL in .env.
 *
 * Human-supervised operator action: it writes to the live bucket and DB.
 * The CLI needs login credentials (`SUPABASE_ACCESS_TOKEN` in .env or an
 * existing `supabase login` session) — without them it fails loudly.
 */

import fs from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")

function log(message) {
  console.log(`[community-thumbs] ${message}`)
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

function runCli(args) {
  return new Promise((resolve, reject) => {
    execFile("supabase", args, { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`supabase ${args.join(" ")} failed (${err.code}): ${stderr || stdout || err.message}`))
      else resolve(stdout)
    })
  })
}

// db query prints a prompt-injection-boundary JSON wrapper; pull the first
// balanced JSON object out of stdout before parsing.
function parseCliJson(stdout) {
  const start = stdout.indexOf("{")
  if (start < 0) throw new Error(`supabase db query printed no JSON: ${stdout.slice(0, 200)}`)
  let depth = 0
  for (let i = start; i < stdout.length; i++) {
    if (stdout[i] === "{") depth++
    else if (stdout[i] === "}") {
      depth--
      if (depth === 0) {
        const parsed = JSON.parse(stdout.slice(start, i + 1))
        if (parsed && parsed._tag === "Error") {
          throw new Error(parsed.error?.message ?? JSON.stringify(parsed))
        }
        return parsed
      }
    }
  }
  throw new Error(`could not parse supabase db query output: ${stdout.slice(0, 200)}`)
}

async function main() {
  const env = {
    ...parseEnvFile(path.join(ROOT, ".env")),
    ...parseEnvFile(path.join(ROOT, ".env.local")),
    ...process.env,
  }
  if (!env.VITE_SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL missing from .env — needed to build the public thumb base")
  }
  const publicStorageBase = `${env.VITE_SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/garments`

  log("querying public garments without thumbs…")
  const payload = parseCliJson(
    await runCli([
      "db", "query", "--linked", "--output-format", "json",
      "select id, user_id, name, description, slot, body_group, covers, saved_count, like_count, added, texture_url" +
        // The CLI bypasses RLS, so mirror the anon select policy's
        // `is_public = true and moderation_state = 'ok'` gate by hand.
        " from public.garments where is_public and moderation_state = 'ok' and thumb_url is null order by created_at",
    ]),
  )
  const garments = payload.rows ?? []
  if (garments.length === 0) {
    log("nothing to backfill: every public garment already has a thumb_url")
    return
  }
  log(`found ${garments.length} public garment(s) without thumbs`)

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "community-thumbs-"))
  let server
  let browser
  try {
    const port = await freePort()
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

    await page.addInitScript((rows) => {
      window.__COMMUNITY_GARMENTS__ = rows
    }, garments)

    await page.goto(new URL("scripts/render-community-thumbs.html", base).toString(), {
      waitUntil: "domcontentloaded",
    })
    await page.waitForFunction(
      () => window.__COMMUNITY_RESULT__ || document.title === "RENDER_FAILED",
      { timeout: 300_000 },
    )

    const failed = await page.evaluate(() => document.title === "RENDER_FAILED")
    if (failed) {
      const detail = await page.evaluate(() => document.getElementById("out")?.textContent ?? "")
      throw new Error(detail || "render page failed")
    }

    const { results, failures } = await page.evaluate(() => window.__COMMUNITY_RESULT__)
    for (const failure of failures ?? []) {
      log(`WARN render failed for ${failure.id}: ${failure.error}`)
    }
    if (!Array.isArray(results) || results.length === 0) throw new Error("render produced no thumbs")

    for (const { id, png } of results) {
      const row = garments.find((g) => g.id === id)
      writePng(png, path.join(staging, row.user_id, `${id}.thumb.png`))
    }
    log(`baked ${results.length} thumb(s) into ${staging}`)

    // Per-file failures never abort the run: one bad garment should not cost
    // the rest of the batch its thumbs.
    const uploadedRows = []
    let uploadFailures = 0
    for (const { id } of results) {
      const row = garments.find((g) => g.id === id)
      const local = path.join(staging, row.user_id, `${id}.thumb.png`)
      const dest = `ss:///garments/${row.user_id}/${id}.thumb.png`
      try {
        await runCli([
          "--experimental", "storage", "cp", local, dest,
          "--linked", "--content-type", "image/png", "--cache-control", "31536000",
        ])
        uploadedRows.push(row)
        log(`uploaded ${row.user_id}/${id}.thumb.png`)
      } catch (err) {
        uploadFailures++
        log(`WARN upload failed for ${id}: ${err instanceof Error ? err.message : err}`)
      }
    }

    // One SQL pass, scoped to the ids actually uploaded so a garment published
    // mid-run never gets a dangling thumb_url.
    const idList = uploadedRows.map((row) => `'${row.id}'`).join(", ")
    const sql =
      `update public.garments g\n` +
      `set thumb_url = '${publicStorageBase}/' || g.user_id || '/' || g.id || '.thumb.png'\n` +
      `where g.is_public and g.thumb_url is null and g.id in (${idList});\n` +
      `select count(*) as updated from public.garments where thumb_url is not null;\n`
    const sqlPath = path.join(staging, "update-thumb-urls.sql")
    fs.writeFileSync(sqlPath, sql)
    const updateOut = await runCli(["db", "query", "--linked", "-f", sqlPath])
    log(`row update output: ${updateOut.trim().split("\n").filter(Boolean).slice(-3).join(" | ")}`)

    log(`DONE: found ${garments.length}, baked ${results.length}, uploaded ${uploadedRows.length}` +
      (uploadFailures ? ` (${uploadFailures} upload failure(s))` : "") +
      `, updated ${uploadedRows.length} row(s)`)
  } finally {
    if (browser) await browser.close().catch(() => {})
    if (server) await server.close().catch(() => {})
    fs.rmSync(staging, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(`[community-thumbs] FAILED: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
