#!/usr/bin/env node
/**
 * Prerenders static HTML entrypoints for GitHub Pages hosting.
 *
 * Every page ships as real, crawlable HTML: <title>, meta description, OG/Twitter
 * embed tags, a <link rel="canonical">, JSON-LD structured data, and — new — an
 * actual <body> with an <h1>, intro copy, images with alt + dimensions, internal
 * links, and a footer with the Mojang disclaimer. Social crawlers get rich
 * embeds; search crawlers get indexable content without executing client JS.
 *
 * Indexation quality gates:
 *  - private / unhidden-gated content is never prerendered (no URL, no sitemap entry)
 *  - pieces with a sparse description get `noindex,follow` instead of thin content
 *  - public looks fetch an id list at build time and only ids in that list get pages
 *
 * The static copy is inserted before the SPA mount point and removed by an
 * inline script as soon as any JS runs, so users never see it twice while
 * non-JS crawlers still index the full text.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "dist")
const INDEX_HTML = path.join(DIST, "index.html")

const BASE_URL = process.env.VITE_BASE_URL || "https://looms.gg"
/** Pieces under this description length are thin content → noindex,follow. */
const THIN_DESCRIPTION_LENGTH = 40

/** slot id → human label (kept in sync with src/data/pieceTypes.ts SLOT_LABEL). */
const SLOT_LABELS = {
  eyes: "eyes",
  hair: "hair",
  hat: "hat",
  face: "face accessory",
  shirt: "shirt",
  set: "outfit set",
  coat: "coat",
  pants: "pants",
  shoes: "shoes",
}

function slotLabel(slot) {
  return SLOT_LABELS[slot] ?? "clothing"
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Sanitizes prerendered text the same way src/lib/sanitize.ts does. */
function sanitizePrerenderText(input, maxLength) {
  let text = String(input ?? "")
  text = text.replace(/<\s*(?:script|style|iframe)[^>]*>[\s\S]*?<\s*\/\s*(?:script|style|iframe)\s*>/gi, "")
  text = text.replace(/<[^>]*>?/gm, "")
  text = text.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF\u202A-\u202E\u2066-\u2069\u200E\u200F]/g,
    "",
  )
  text = text.replace(/[\r\n\t]+/g, " ")
  text = text.trim()
  if (text.length > maxLength) text = text.slice(0, maxLength).trimEnd()
  return text
}

function truncateOnWordBoundary(text, maxLength) {
  if (text.length <= maxLength) return text
  const slice = text.slice(0, maxLength)
  const cut = slice.lastIndexOf(" ")
  return `${(cut > maxLength * 0.6 ? slice.slice(0, cut) : slice).trimEnd()}…`
}

function injectMeta(template, { title, description, url, image, type = "website", index = true, jsonLd = null }) {
  const safeTitle = escapeHtml(title)
  const safeDesc = escapeHtml(description)
  const safeUrl = escapeHtml(url)
  const safeImg = escapeHtml(image)
  const robots = index ? "index, follow" : "noindex, follow"

  let html = template

  // The SPA template has no per-page canonical/robots — add ours before </head>.
  const pageHead = [
    `  <link rel="canonical" href="${safeUrl}" />`,
    `  <meta name="robots" content="${robots}" />`,
  ].join("\n")
  html = html.replace("</head>", `${pageHead}\n  </head>`)

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

  // JSON-LD structured data. JSON.stringify output with < and > escaped keeps
  // the block safe from `</script>` breakout inside raw script text.
  if (jsonLd) {
    const jsonLdBlock = `  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")}\n  </script>\n`
    html = html.replace("</head>", `${jsonLdBlock}  </head>`)
  }

  return html
}

/**
 * Builds the crawlable body. All dynamic strings are sanitized + escaped;
 * images carry intrinsic width/height so layout is stable before CSS lands.
 */
function buildPageBody({
  h1,
  intro,
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  sections = [],
  links = [],
}) {
  const img = image
    ? `<img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(imageAlt)}"
              width="${imageWidth}"
              height="${imageHeight}"
              loading="eager"
              decoding="async"
            />`
    : ""

  const sectionsHtml = sections
    .map(
      (s) => `          <section>
            <h2>${escapeHtml(s.heading)}</h2>
            <p>${escapeHtml(s.body)}</p>
          </section>`,
    )
    .join("\n")

  const linksHtml = links
    .map(
      (l) => `              <li>
                <a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>
              </li>`,
    )
    .join("\n")

  return `      <div class="prerendered-content">
        <main class="seo-content">
          <h1>${escapeHtml(h1)}</h1>
          <p class="seo-intro">${escapeHtml(intro)}</p>
${
  img
    ? `          <div class="seo-figure">
            ${img}
          </div>
`
    : ""
}${sectionsHtml ? `\n${sectionsHtml}\n` : ""}${
    links.length
      ? `          <nav class="seo-links" aria-label="Related content">
            <h2>Related content</h2>
            <ul>
${linksHtml}
            </ul>
          </nav>
`
      : ""
  }        </main>
        <footer class="seo-footer">
          <p>looms is an unofficial Minecraft fan project — not affiliated with, endorsed by, or sponsored by Mojang Studios or Microsoft. Minecraft is a trademark of Mojang Synergies AB.</p>
          <p>
            <a href="${BASE_URL}/guidelines">Community Guidelines</a> ·
            <a href="${BASE_URL}/terms">Terms (DMCA / copyright contact)</a> ·
            <a href="${BASE_URL}/privacy">Privacy</a>
          </p>
        </footer>
      </div>
`
}

function injectBody(html, bodyHtml) {
  // The SPA shell body is `<div id="root"></div>` + module script. The static
  // copy mounts BEFORE the root div and a tiny inline script removes it as
  // soon as any JavaScript runs: browsers and JS-capable crawlers (Googlebot
  // renders) see only the SPA, while non-JS crawlers index the full text.
  return html.replace(
    '<div id="root"></div>',
    `<div id="seo-prerendered">
${bodyHtml}      </div>
    <div id="root"></div>
    <script>
      ;(function () {
        var el = document.getElementById("seo-prerendered")
        if (el) el.parentNode.removeChild(el)
      })()
    </script>`,
  )
}

/**
 * Public, non-hidden look ids straight from the database. The moderation_state
 * filter is the server-side indexation gate; when the column is missing (older
 * environment) the request fails and we return [] — no look URLs ship.
 */
async function fetchPublicLookIds() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return []
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/looks?visibility=eq.public&moderation_state=neq.hidden&select=id,updated_at,moderation_state`,
      {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      },
    )
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
  if (!template.includes('<div id="root"></div>')) {
    console.error("❌ dist/index.html does not contain the SPA mount point — aborting to avoid clobbering the template.")
    process.exit(1)
  }
  const seedPath = path.join(ROOT, "src/data/catalog-seed.json")
  const catalog = JSON.parse(fs.readFileSync(seedPath, "utf8"))

  let count = 0
  let noindexCount = 0

  // 1. Prerender catalog pieces: dist/piece/<id>/index.html
  for (const piece of catalog) {
    const pieceDir = path.join(DIST, "piece", piece.id)
    fs.mkdirSync(pieceDir, { recursive: true })

    const slotName = (piece.slot || "shirt").toUpperCase()
    const pieceUrl = `${BASE_URL}/piece/${piece.id}`
    const description = piece.blurb
      ? truncateOnWordBoundary(`${piece.blurb} · ${slotName} · Minecraft clothing on looms`, 160)
      : `${piece.name} (${slotName}) — modular Minecraft clothing piece on looms.`

    // Indexation gate: pieces whose only text is the name are thin content.
    const isThin = !piece.blurb || piece.blurb.length < THIN_DESCRIPTION_LENGTH
    if (isThin) noindexCount++

    const title = `${piece.name} — ${slotName} Minecraft clothing piece | looms`
    const h1 = `${piece.name} — Minecraft ${slotLabel(piece.slot)} layer`
    const intro = piece.blurb
      ? `${piece.blurb} ${piece.name} is a community-made ${slotLabel(piece.slot)} layer for Minecraft skins on looms. Add it to your wardrobe, stack it with other pieces in Studio, and export a vanilla 64×64 skin PNG — free.`
      : `${piece.name} is a modular ${slotLabel(piece.slot)} layer for Minecraft skins on looms. Stack it in Studio and export a vanilla skin PNG — free.`

    const sections = [
      {
        heading: "How to wear it",
        body: `Open ${piece.name} in the looms Studio, stack it with hair, shirts, coats, pants, and shoes from the community catalog, then export a ready-to-use Minecraft skin. Layers composite onto the skin's outer layer, so outfits stack cleanly.`,
      },
    ]

    // Related pieces: same slot first, then same body group — internal links
    // that give crawlers a path from every piece page to the rest of catalog.
    const related = catalog
      .filter((p) => p.id !== piece.id)
      .sort((a, b) => {
        const scoreA = (a.slot === piece.slot ? 2 : 0) + (a.group === piece.group ? 1 : 0)
        const scoreB = (b.slot === piece.slot ? 2 : 0) + (b.group === piece.group ? 1 : 0)
        return scoreB - scoreA
      })
      .slice(0, 4)
      .map((p) => ({ label: `${p.name} (${slotLabel(p.slot)})`, href: `${BASE_URL}/piece/${p.id}` }))

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: piece.name,
      description,
      url: pieceUrl,
      image: `${BASE_URL}/og/pieces/${piece.id}.png`,
      isAccessibleForFree: true,
      genre: `Minecraft ${slotLabel(piece.slot)}`,
      keywords: `minecraft ${piece.slot}, minecraft ${slotLabel(piece.slot)}, minecraft skin layer, looms`,
      inLanguage: "en",
    }

    const html = injectMeta(template, {
      title,
      description,
      url: pieceUrl,
      image: `${BASE_URL}/og/pieces/${piece.id}.png`,
      type: "article",
      index: !isThin,
      jsonLd,
    })

    const body = buildPageBody({
      h1,
      intro,
      image: `${BASE_URL}/iso/pieces/${piece.id}.png`,
      imageAlt: `${piece.name}, a ${slotLabel(piece.slot)} piece for Minecraft skins, drawn on a Minecraft character preview`,
      imageWidth: 180,
      imageHeight: 210,
      sections,
      links: related,
    })

    fs.writeFileSync(path.join(pieceDir, "index.html"), injectBody(html, body), "utf8")
    count++
  }

  console.log(`✅ Prerendered ${count} piece pages in dist/piece/ (${noindexCount} thin pages marked noindex,follow)`)

  // 2. Look pages: only ids returned by the database's public+unhidden filter.
  const publicLooks = await fetchPublicLookIds()
  const lookDir = path.join(DIST, "look")
  fs.mkdirSync(lookDir, { recursive: true })

  // Landing page for looks
  const lookLandingHtml = injectMeta(template, {
    title: "Minecraft Outfits & Community Looks | looms",
    description:
      "Browse modular layered Minecraft outfits by the looms community. Preview looks in 3D, wear them in Studio, and export a vanilla 64×64 skin PNG — free.",
    url: `${BASE_URL}/look`,
    image: `${BASE_URL}/og/outfit-default.png`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Minecraft Outfits & Community Looks",
      description: "Community-made layered Minecraft outfits you can preview, remix, and wear.",
      url: `${BASE_URL}/look`,
      isAccessibleForFree: true,
    },
  })
  const lookLandingBody = buildPageBody({
    h1: "Minecraft outfits & community looks",
    intro:
      "Browse layered Minecraft outfits made by the looms community. Every look is a stack of modular clothing pieces — preview it on a 3D character, open it in Studio to remix, and export a vanilla 64×64 skin PNG that works in Minecraft Java and Bedrock.",
    image: `${BASE_URL}/og/outfit-default.png`,
    imageAlt: "A Minecraft character wearing a layered community outfit from looms",
    imageWidth: 1200,
    imageHeight: 630,
    sections: [
      {
        heading: "How looks work",
        body: "A look is an ordered stack of pieces: eyes, shirt, set, coat, pants, shoes, hair, face, hat. Higher pieces punch the outer Minecraft skin layer of pieces below them, so outfits layer naturally instead of fighting for pixels.",
      },
    ],
    links: catalog.slice(0, 6).map((p) => ({
      label: `${p.name} (${slotLabel(p.slot)})`,
      href: `${BASE_URL}/piece/${p.id}`,
    })),
  })
  fs.writeFileSync(path.join(lookDir, "index.html"), injectBody(lookLandingHtml, lookLandingBody), "utf8")

  let lookCount = 0
  for (const look of publicLooks) {
    if (!look || typeof look.id !== "string" || !look.id) continue
    const itemDir = path.join(DIST, "look", look.id)
    fs.mkdirSync(itemDir, { recursive: true })
    const lookUrl = `${BASE_URL}/look/${look.id}`
    const lookName = sanitizePrerenderText(look.name ?? "Community look", 50)
    const lookDesc = sanitizePrerenderText(look.description ?? "", 500)

    const html = injectMeta(template, {
      title: `${lookName} — Minecraft outfit | looms`,
      description: lookDesc
        ? truncateOnWordBoundary(`${lookDesc} · Minecraft outfit on looms`, 160)
        : `${lookName} — community Minecraft outfit on looms. Preview in 3D and export the skin free.`,
      url: lookUrl,
      image: `${BASE_URL}/og/outfit-default.png`,
      type: "article",
      index: true,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: lookName,
        description: lookDesc || `${lookName} — community Minecraft outfit on looms.`,
        url: lookUrl,
        image: `${BASE_URL}/og/outfit-default.png`,
        isAccessibleForFree: true,
        inLanguage: "en",
      },
    })

    const body = buildPageBody({
      h1: `${lookName} — Minecraft outfit`,
      intro: lookDesc
        ? `${lookDesc} ${lookName} is a community-made layered Minecraft outfit on looms. Open it in Studio to wear or remix it, then export a vanilla skin PNG.`
        : `${lookName} is a community-made layered Minecraft outfit on looms. Open it in Studio to wear or remix it, then export a vanilla skin PNG.`,
      image: `${BASE_URL}/og/outfit-default.png`,
      imageAlt: `${lookName}, a community-made layered Minecraft outfit preview on looms`,
      imageWidth: 1200,
      imageHeight: 630,
      links: catalog.slice(0, 4).map((p) => ({
        label: `${p.name} (${slotLabel(p.slot)})`,
        href: `${BASE_URL}/piece/${p.id}`,
      })),
    })

    fs.writeFileSync(path.join(itemDir, "index.html"), injectBody(html, body), "utf8")
    lookCount++
  }

  if (lookCount > 0) {
    console.log(`✅ Prerendered ${lookCount} public look pages in dist/look/`)
  }

  // 3. Home page — the SPA shell gets a crawlable copy of the hero copy.
  const homeHtml = injectMeta(template, {
    title: "looms — Free Minecraft Clothing & Skin Layers",
    description:
      "Mix and match layered Minecraft clothing, hair, and accessories into custom skins in 3D. Free to style, export, and wear.",
    url: `${BASE_URL}/`,
    image: `${BASE_URL}/og-image.png`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "looms",
      alternateName: "looms.gg",
      url: `${BASE_URL}/`,
      description:
        "Free modular wardrobe for Minecraft skins: browse community clothing layers, stack outfits in Studio, export a vanilla 64×64 PNG.",
      isAccessibleForFree: true,
    },
  })
  const homeBody = buildPageBody({
    h1: "Custom Minecraft skins. No art skills needed.",
    intro:
      "Mix and match layered clothing, hair, and accessories into custom Minecraft skins. looms is a free modular wardrobe: browse the community catalog of clothing pieces, stack outfits on a 3D character in Studio, and export a vanilla 64×64 PNG that works instantly in Minecraft Java and Bedrock.",
    image: `${BASE_URL}/og-image.png`,
    imageAlt: "Three Minecraft characters wearing layered looms outfits",
    imageWidth: 1200,
    imageHeight: 630,
    sections: [
      {
        heading: "Modular clothing layers",
        body: "Pick pieces by slot — hair, hats, face accessories, shirts, coats, pants, and shoes — and stack them in any order. Higher pieces paint over lower ones on the Minecraft skin's outer layer, so outfits composite cleanly.",
      },
      {
        heading: "Free to style, export, and wear",
        body: "No art skills, no ads, no paid unlocks. Save looks to your wardrobe, share them with permalinks, and export vanilla PNG skins that work in Minecraft Java and Bedrock.",
      },
    ],
    links: [
      ...catalog.slice(0, 6).map((p) => ({
        label: `${p.name} (${slotLabel(p.slot)})`,
        href: `${BASE_URL}/piece/${p.id}`,
      })),
      { label: "Browse all Minecraft outfits", href: `${BASE_URL}/look` },
      { label: "Community guidelines", href: `${BASE_URL}/guidelines` },
    ],
  })
  fs.writeFileSync(path.join(DIST, "index.html"), injectBody(homeHtml, homeBody), "utf8")

  console.log("✅ Prerendered home page with crawlable hero content")
}

main().catch((err) => {
  console.error("❌ Prerender script error:", err)
  process.exit(1)
})
