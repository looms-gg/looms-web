#!/usr/bin/env node
/**
 * Generates dist/robots.txt and dist/sitemap.xml after the Vite build.
 *
 * - robots.txt points crawlers at the sitemap and keeps them out of auth-gated
 *   and utility routes; it is a real static file in dist/ (previously both
 *   requests fell through to the HTML SPA shell and were unreadable).
 * - sitemap.xml lists only indexable canonical URLs. Catalog pieces come from
 *   the repo seed; public look URLs are discovered from Supabase at build time
 *   (same env contract as prerender-embeds.mjs) and skipped entirely when the
 *   env or network is unavailable, so no dead URLs ship in the sitemap.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "dist")
const BASE_URL = process.env.VITE_BASE_URL || "https://looms.gg"

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
    // break the build.
    const res = await fetch(
      `${supabaseUrl}/rest/v1/looks?visibility=eq.public&moderation_state=neq.hidden&select=id,updated_at,moderation_state`,
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
    return await res.json()
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

  // 2. sitemap.xml — canonical, indexable URLs only.
  const catalog = JSON.parse(
    fs.readFileSync(path.join(ROOT, "src/data/catalog-seed.json"), "utf8"),
  )
  const now = new Date().toISOString()

  const urls = [
    { path: `${BASE_URL}/`, changefreq: "daily", priority: "1.0" },
    { path: `${BASE_URL}/look`, changefreq: "daily", priority: "0.8" },
    { path: `${BASE_URL}/guidelines`, changefreq: "monthly", priority: "0.3" },
    { path: `${BASE_URL}/privacy`, changefreq: "yearly", priority: "0.3" },
    { path: `${BASE_URL}/terms`, changefreq: "yearly", priority: "0.3" },
    { path: `${BASE_URL}/cookies`, changefreq: "yearly", priority: "0.2" },
  ]

  for (const piece of catalog) {
    urls.push({
      path: `${BASE_URL}/piece/${encodeURIComponent(piece.id)}`,
      lastmod: now,
      changefreq: "weekly",
      priority: "0.7",
    })
  }

  const looks = await fetchPublicLookIds()
  for (const look of looks) {
    if (!look || typeof look.id !== "string") continue
    urls.push({
      path: `${BASE_URL}/look/${encodeURIComponent(look.id)}`,
      lastmod: look.updated_at ?? now,
      changefreq: "weekly",
      priority: "0.6",
    })
  }

  fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemapXml(urls), "utf8")

  console.log(
    `✅ Wrote dist/robots.txt and dist/sitemap.xml (${urls.length} URLs: ${catalog.length} pieces, ${looks.length} looks)`,
  )
}

main().catch((err) => {
  console.error("❌ SEO file generation failed:", err)
  process.exit(1)
})
