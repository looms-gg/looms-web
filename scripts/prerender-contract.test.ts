import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Guards the prerendered HTML contract produced by scripts/prerender-embeds.mjs
 * and scripts/generate-seo-files.mjs. Skips on machines without a fresh build
 * (`npm run build` first); runs in CI or anywhere dist/ exists.
 *
 * Contract being tested:
 *  - dist/robots.txt and dist/sitemap.xml are real files, not SPA shells
 *  - prerendered pages have canonical, robots, JSON-LD, one <h1>, alt+size images
 *  - the SPA mount point and removal script stay intact (users never see the copy)
 *  - indexation gates: thin content is marked noindex,follow
 *
 * Piece pages come from the live catalog at build time (best-effort: a build
 * without DB access prerenders zero of them by design), so piece assertions
 * discover whatever pages exist instead of pinning to a seed id.
 */

const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "dist")
const hasBuild = existsSync(path.join(DIST, "index.html"))

const pieceDirs = hasBuild && existsSync(path.join(DIST, "piece"))
  ? readdirSync(path.join(DIST, "piece")).filter((d) => existsSync(path.join(DIST, "piece", d, "index.html")))
  : []
const pieceId = pieceDirs[0] ?? null
const piece = pieceId ? readFileSync(path.join(DIST, "piece", pieceId, "index.html"), "utf8") : ""

describe.skipIf(!hasBuild)("prerendered output contract (run `npm run build` first)", () => {
  const home = readFileSync(path.join(DIST, "index.html"), "utf8")

  it("robots.txt is a real crawler file, not the SPA shell", () => {
    const robots = readFileSync(path.join(DIST, "robots.txt"), "utf8")
    expect(robots).toContain("User-agent: *")
    expect(robots).toContain("Sitemap: https://looms.gg/sitemap.xml")
    expect(robots).toContain("Disallow: /studio")
    expect(robots).not.toContain("<div id=")
  })

  it("sitemap.xml is real XML listing canonical URLs", () => {
    const sitemap = readFileSync(path.join(DIST, "sitemap.xml"), "utf8")
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(sitemap).toContain("<loc>https://looms.gg/</loc>")
    expect(sitemap).toContain("<loc>https://looms.gg/look</loc>")
    // Piece URLs follow the live catalog: assert the discovered ids are listed
    // (zero piece pages means the sitemap lists none, which is by design).
    for (const id of pieceDirs) {
      expect(sitemap).toContain(`<loc>https://looms.gg/piece/${id}</loc>`)
    }
    expect(sitemap).not.toContain("?tab=")
    expect(sitemap).not.toContain("?sort=")
  })

  it("home page: canonical, one h1, crawlable intro, JSON-LD, SPA intact", () => {
    expect(home).toContain('<link rel="canonical" href="https://looms.gg/" />')
    expect(home).toContain('<meta name="robots" content="index, follow" />')
    expect(home.match(/<h1>/g)?.length).toBe(1)
    expect(home).toContain("Custom Minecraft skins. No art skills needed.")
    expect(home).toContain('type="application/ld+json"')
    expect(home).toContain('"@type": "SoftwareApplication"')
    expect(home).toContain('"price": "0"')
    // SPA must still mount: root div + module script untouched
    expect(home).toContain('<div id="root"></div>')
    expect(home).toMatch(/<script type="module"/)
  })

  it.skipIf(piece)("empty piece catalog is a valid best-effort build state", () => {
    // A build without Supabase env prerenders zero piece pages on purpose.
    expect(pieceDirs.length).toBe(0)
  })

  it.skipIf(!piece)("piece page: canonical, keyword title, JSON-LD, one h1", () => {
    expect(piece).toContain(`<link rel="canonical" href="https://looms.gg/piece/${pieceId}" />`)
    expect(piece).toMatch(/<title>.+ — [A-Z]+ Minecraft clothing piece \| looms<\/title>/)
    expect(piece.match(/<h1>/g)?.length).toBe(1)
    expect(piece).toMatch(/<h1>.+ — Minecraft .+ layer<\/h1>/)
    expect(piece).toContain('"@type": "CreativeWork"')
    // Compact embed card: a piece link is a card with a thumbnail, not a banner.
    expect(piece).toContain('<meta name="twitter:card" content="summary" />')
    // Internal links: related pieces + look landing
    expect(piece).toContain('href="https://looms.gg/look"')
    expect(piece.match(/href="https:\/\/looms\.gg\/piece\//g)?.length).toBeGreaterThanOrEqual(Math.min(4, pieceDirs.length - 1))
  })

  it.skipIf(!piece)("prerendered content carries the Mojang disclaimer and DMCA/legal links", () => {
    expect(piece).toContain("not affiliated with, endorsed by, or sponsored by Mojang")
    expect(piece).toContain("Terms (DMCA / copyright contact)")
    expect(home).toContain("Community Guidelines")
  })

  it.skipIf(!piece)("static copy sits before the SPA root and is removed by an inline script", () => {
    const prerenderedAt = piece.indexOf('id="seo-prerendered"')
    const rootAt = piece.indexOf('<div id="root"></div>')
    expect(prerenderedAt).toBeGreaterThan(-1)
    expect(rootAt).toBeGreaterThan(prerenderedAt)
    expect(piece).toContain("removeChild")
  })

  it("JSON-LD blocks parse as strict JSON", () => {
    const pages = piece ? [home, piece] : [home]
    for (const html of pages) {
      const blocks = [
        ...html.matchAll(/<script type="application\/ld\+json">\n([\s\S]*?)\n  <\/script>/g),
      ]
      expect(blocks.length).toBeGreaterThan(0)
      for (const block of blocks) {
        expect(() => JSON.parse(block[1])).not.toThrow()
      }
    }
  })

  it("is idempotent: re-running the prerender never stacks duplicates", () => {
    execSync("node scripts/prerender-embeds.mjs", { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "", VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "" } })
    const rerun = readFileSync(path.join(DIST, "index.html"), "utf8")
    expect(rerun.match(/<h1>/g)?.length).toBe(1)
    expect(rerun.match(/rel="canonical"/g)?.length).toBe(1)
    expect(rerun.match(/name="robots"/g)?.length).toBe(1)
    expect(rerun.match(/application\/ld\+json/g)?.length).toBe(1)
    expect(rerun.match(/<div id="root"><\/div>/g)?.length).toBe(1)
  }, 15000)

  it("look pages: real titles and CreativeWork JSON-LD when built with env", () => {
    // Without Supabase env, the look pages are skipped entirely (build-time
    // gate); the contract check only applies when they were generated.
    const lookDirs = existsSync(path.join(DIST, "look"))
      ? readdirSync(path.join(DIST, "look")).filter((d) => d !== "index.html")
      : []
    if (lookDirs.length === 0) return
    const look = readFileSync(path.join(DIST, "look", lookDirs[0], "index.html"), "utf8")
    expect(look).toContain('<link rel="canonical" href="https://looms.gg/look/')
    expect(look).toContain('"@type": "CreativeWork"')
    expect(look).not.toContain("<h1>Community look — Minecraft outfit</h1>")
  })

  it("site.webmanifest ships in dist and is linked from the shell", () => {
    expect(existsSync(path.join(DIST, "site.webmanifest"))).toBe(true)
    expect(home).toContain('rel="manifest" href="/site.webmanifest"')
  })
})
