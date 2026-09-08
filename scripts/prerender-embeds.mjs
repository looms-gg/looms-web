#!/usr/bin/env node
/**
 * Prerenders static HTML entrypoints with rich Open Graph and Twitter Card tags
 * for GitHub Pages hosting, ensuring Discord, Twitter, and other crawlers receive
 * rich embeds with HTTP 200 without executing client JS.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "dist")
const INDEX_HTML = path.join(DIST, "index.html")

const BASE_URL = process.env.VITE_BASE_URL || "https://looms-gg.github.io/looms-web"

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function injectMeta(template, { title, description, url, image, type = "website" }) {
  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safeUrl = escapeHtml(url)
  const safeImg = escapeHtml(image)

  let html = template

  // Title
  html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)

  // Meta description
  html = html.replace(
    /<meta\s+name="description"\s+content=".*?"\s*\/>/s,
    `<meta name="description" content="${safeDesc}" />`,
  )

  // Open Graph
  html = html.replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/>/s,
    `<meta property="og:title" content="${safeTitle}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/>/s,
    `<meta property="og:description" content="${safeDesc}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:url"\s+content=".*?"\s*\/>/s,
    `<meta property="og:url" content="${safeUrl}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:image"\s+content=".*?"\s*\/>/s,
    `<meta property="og:image" content="${safeImg}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:type"\s+content=".*?"\s*\/>/s,
    `<meta property="og:type" content="${type}" />`,
  )

  // Twitter
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/>/s,
    `<meta name="twitter:title" content="${safeTitle}" />`,
  )
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/>/s,
    `<meta name="twitter:description" content="${safeDesc}" />`,
  )
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content=".*?"\s*\/>/s,
    `<meta name="twitter:image" content="${safeImg}" />`,
  )

  return html
}

async function fetchSupabaseLooks() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return []

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/looks?visibility=eq.public&select=id,name,description`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function main() {
  if (!fs.existsSync(INDEX_HTML)) {
    console.error("❌ dist/index.html not found. Run `vite build` first.")
    process.exit(1)
  }

  const template = fs.readFileSync(INDEX_HTML, "utf8")
  const seedPath = path.join(ROOT, "src/data/catalog-seed.json")
  const catalog = JSON.parse(fs.readFileSync(seedPath, "utf8"))

  let count = 0

  // 1. Prerender catalog pieces: dist/piece/<id>/index.html
  for (const piece of catalog) {
    const pieceDir = path.join(DIST, "piece", piece.id)
    fs.mkdirSync(pieceDir, { recursive: true })

    const slotName = (piece.slot || "shirt").toUpperCase()
    const description = piece.blurb
      ? `${piece.blurb} · ${slotName} · Minecraft clothing on looms`
      : `${piece.name} (${slotName}) — modular Minecraft clothing piece on looms.`

    const html = injectMeta(template, {
      title: `${piece.name} — looms`,
      description,
      url: `${BASE_URL}/piece/${piece.id}`,
      image: `${BASE_URL}/og/pieces/${piece.id}.png`,
    })

    fs.writeFileSync(path.join(pieceDir, "index.html"), html, "utf8")
    count++
  }

  console.log(`✅ Prerendered ${count} piece pages in dist/piece/`)

  // 2. Prerender default look landing: dist/look/index.html
  const lookDir = path.join(DIST, "look")
  fs.mkdirSync(lookDir, { recursive: true })
  const defaultLookHtml = injectMeta(template, {
    title: "Minecraft Outfits & Looks — looms",
    description: "Explore modular layered Minecraft outfits. Style, mix in Studio, and export to your Minecraft skin.",
    url: `${BASE_URL}/look`,
    image: `${BASE_URL}/og/outfit-default.png`,
  })
  fs.writeFileSync(path.join(lookDir, "index.html"), defaultLookHtml, "utf8")

  // Default featured looks (guaranteed offline)
  const defaultLooks = [
    {
      id: "featured-winter-explorer",
      name: "Winter Explorer",
      description: "Cozy winter layers for exploring snowy biomes.",
    },
    {
      id: "featured-look",
      name: "Winter Explorer",
      description: "Cozy winter layers for exploring snowy biomes.",
    },
  ]

  let lookCount = 0
  for (const look of defaultLooks) {
    const itemDir = path.join(DIST, "look", look.id)
    fs.mkdirSync(itemDir, { recursive: true })
    const html = injectMeta(template, {
      title: `${look.name} (Outfit) — looms`,
      description: `${look.description} · Minecraft outfit on looms`,
      url: `${BASE_URL}/look/${look.id}`,
      image: `${BASE_URL}/og/outfit-default.png`,
    })
    fs.writeFileSync(path.join(itemDir, "index.html"), html, "utf8")
    lookCount++
  }

  // 3. Prerender public looks if available from Supabase
  const publicLooks = await fetchSupabaseLooks()
  for (const look of publicLooks) {
    if (defaultLooks.some((d) => d.id === look.id)) continue
    const itemDir = path.join(DIST, "look", look.id)
    fs.mkdirSync(itemDir, { recursive: true })

    const description = look.description
      ? `${look.description} · Minecraft outfit on looms`
      : `${look.name} — custom modular Minecraft outfit on looms.`

    const html = injectMeta(template, {
      title: `${look.name} (Outfit) — looms`,
      description,
      url: `${BASE_URL}/look/${look.id}`,
      image: `${BASE_URL}/og/outfit-default.png`,
    })

    fs.writeFileSync(path.join(itemDir, "index.html"), html, "utf8")
    lookCount++
  }

  if (lookCount > 0) {
    console.log(`✅ Prerendered ${lookCount} public look pages in dist/look/`)
  }
}

main().catch((err) => {
  console.error("❌ Prerender script error:", err)
  process.exit(1)
})
