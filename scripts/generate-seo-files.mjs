#!/usr/bin/env node
/**
 * Generates dist/robots.txt and dist/sitemap.xml after the Vite build.
 *
 * - robots.txt points crawlers at the sitemap and keeps them out of auth-gated
 *   and utility routes; it is a real static file in dist/ (previously both
 *   requests fell through to the HTML SPA shell and were unreadable).
 * - sitemap.xml lists only indexable canonical URLs. Piece URLs come from
 *   the public garments table at build time (same env contract as
 *   prerender-embeds.mjs); public look URLs are discovered the same way.
 *   Both are skipped entirely when the env or network is unavailable, so no
 *   dead URLs ship in the sitemap.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "dist")
const BASE_URL = process.env.VITE_BASE_URL || "https://looms.gg"

/** Copies the .env loader from scripts/bake-featured-look.mjs (kept local so each build script stays standalone). */
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

const PAGE_SIZE = 1000

/**
 * Paginates a PostgREST select through its Range header: Supabase silently
 * truncates a plain request at 1000 rows, so keep stepping pages while a full
 * page returns.
 */
async function pagedPostgrestSelect({ url, anonKey, baseQueryString, label }) {
  const rows = []
  let offset = 0
  while (true) {
    const res = await fetch(
      `${url}/rest/v1/${baseQueryString}`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        },
      },
    )
    if (!res.ok) {
      throw new Error(`${label} query returned ${res.status}`)
    }
    const page = await res.json()
    if (!Array.isArray(page)) {
      throw new Error(`${label} query returned a non-array body`)
    }
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return rows
}

/**
 * Public garment ids from the database — the same rows the client sees (RLS
 * anon select policy). Best-effort: missing env or a failed fetch yields an
 * empty list, never a broken build.
 */
async function fetchPublicGarmentIds() {
  const { url, anonKey } = loadSupabaseEnv()
  if (!url || !anonKey) {
    console.warn("⚠️  VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY missing; sitemap will list no piece URLs.")
    return []
  }
  try {
    const rows = await pagedPostgrestSelect({
      url,
      anonKey,
      baseQueryString:
        "garments?is_public=eq.true&select=id,name,description,slot&order=added.desc",
      label: "garments",
    })
    console.log(`ℹ️  Fetched ${rows.length} public garment(s) for the sitemap.`)
    return rows.filter((row) => typeof row?.id === "string")
  } catch (err) {
    console.warn(`⚠️  ${err?.message ?? err}; sitemap will list no piece URLs.`)
    return []
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

/** Throttle hints keep the crawl budget on real content, not param noise. */
function buildRobotsTxt() {
  return `# looms.gg — crawler directives
# Everything under /studio, /wardrobe, /settings, /admin and /editor requires
# an account or is a private workspace, so it stays out of the index.
User-agent: *
Allow: /
Disallow: /studio
Disallow: /wardrobe
Disallow: /settings
Disallow: /admin
Disallow: /editor

# Faceted crawl URLs are state mirrors of the canonical / page — exclude them
# explicitly so link equity concentrates on the canonical URL.
Disallow: /*?tab=
Disallow: /*?sort=
Disallow: /*?q=
Disallow: /*?model=
Disallow: /*?slot=
Disallow: /*?view=

# Well-behaved AI/analytics crawlers that ignore per-page noindex get a
# blanket block on private surfaces.
User-agent: GPTBot
Disallow: /studio
Disallow: /wardrobe
Disallow: /settings
Disallow: /admin
Disallow: /editor

User-agent: CCBot
Disallow: /studio
Disallow: /wardrobe
Disallow: /settings
Disallow: /admin
Disallow: /editor

Sitemap: ${BASE_URL}/sitemap.xml
`
}

async function fetchPublicLookIds() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return []

  try {
    // Server-side safety gate: only rows the database itself exposes as public
    // and unreported are listed. The column set is defensive — the flag may
    // not exist yet on a given environment, and a missing column must never
    // break the build. Maker usernames ride along so qualifying profile pages
    // can join the sitemap.
    const res = await fetch(
      `${supabaseUrl}/rest/v1/looks?visibility=eq.public&moderation_state=eq.ok&select=id,updated_at,user_id,moderation_state`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
    )
    if (!res.ok) {
      console.warn(`⚠️  looks query returned ${res.status}; sitemap will list catalog pieces only.`)
      return []
    }
    const looks = await res.json()
    const userIds = [...new Set(looks.map((l) => l.user_id).filter(Boolean))]
    if (!userIds.length) return looks
    try {
      const pres = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(",")})&select=id,username`,
        { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } },
      )
      if (!pres.ok) return looks
      const profiles = new Map((await pres.json()).map((p) => [p.id, p.username]))
      for (const look of looks) look.username = profiles.get(look.user_id) ?? null
    } catch {
      // profiles optional
    }
    return looks
  } catch (err) {
    console.warn(`⚠️  looks query failed (${err?.message ?? err}); sitemap will list catalog pieces only.`)
    return []
  }
}

function sitemapXml(urls) {
  const rows = urls
    .map(
      ({ path: loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${escapeXml(loc)}</loc>${
      lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""
    }${changefreq ? `\n    <changefreq>${escapeXml(changefreq)}</changefreq>` : ""}${
      priority != null ? `\n    <priority>${priority}</priority>` : ""
    }
  </url>`,
    )
    .join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error("❌ dist/ not found. Run `vite build` first.")
    process.exit(1)
  }

  // 1. robots.txt — a real file, not a 200-HTML SPA shell.
  fs.writeFileSync(path.join(DIST, "robots.txt"), buildRobotsTxt(), "utf8")

  // 1.5 404.html — GitHub Pages serves this file (with a 404 status) for any
  // path it cannot match. Shipping a copy of the SPA shell lets deep links
  // like /terms or /settings boot the app and route client-side instead of
  // showing the raw Pages 404.
  const indexPath = path.join(DIST, "index.html")
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, path.join(DIST, "404.html"))
  } else {
    console.warn("⚠️ dist/index.html missing; skipped 404.html generation.")
  }

  // 2. sitemap.xml — canonical, indexable URLs only.
  const garments = await fetchPublicGarmentIds()
  const now = new Date().toISOString()

  const urls = [
    { path: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
    { path: `${BASE_URL}/look`, changefreq: "daily", priority: "0.8" },
    { path: `${BASE_URL}/guidelines`, changefreq: "monthly", priority: "0.3" },
    { path: `${BASE_URL}/privacy`, changefreq: "yearly", priority: "0.3" },
    { path: `${BASE_URL}/terms`, changefreq: "yearly", priority: "0.3" },
    { path: `${BASE_URL}/ai`, changefreq: "yearly", priority: "0.3" },
    { path: `${BASE_URL}/cookies`, changefreq: "yearly", priority: "0.2" },
  ]

  for (const piece of garments) {
    urls.push({
      path: `${BASE_URL}/piece/${encodeURIComponent(piece.id)}`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.7",
    })
  }

  const looks = await fetchPublicLookIds()
  const usernames = new Set()
  for (const look of looks) {
    if (!look || typeof look.id !== "string") continue
    urls.push({
      path: `${BASE_URL}/look/${encodeURIComponent(look.id)}`,
      lastmod: look.updated_at ?? now,
      changefreq: "weekly",
      priority: "0.6",
    })
    if (look.username) usernames.add(look.username)
  }

  // Maker profiles: only accounts with public looks (same indexation gate as
  // the prerendered profile pages).
  for (const username of usernames) {
    urls.push({
      path: `${BASE_URL}/u/${encodeURIComponent(username)}`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.5",
    })
  }

  fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemapXml(urls), "utf8")

  console.log(
      `✅ Wrote dist/robots.txt and dist/sitemap.xml (${urls.length} URLs: ${garments.length} pieces, ${looks.length} looks, ${usernames.size} profiles)`,
  )
}

main().catch((err) => {
  console.error("❌ SEO file generation failed:", err)
  process.exit(1)
})
