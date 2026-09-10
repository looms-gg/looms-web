import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
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
 */

const ROOT = path.resolve(__dirname, "..")
const DIST = path.join(ROOT, "dist")
const hasBuild = existsSync(path.join(DIST, "index.html"))

describe.skipIf(!hasBuild)("prerendered output contract (run `npm run build` first)", () => {
  const home = readFileSync(path.join(DIST, "index.html"), "utf8")
  const piece = readFileSync(path.join(DIST, "piece/winter-coat/index.html"), "utf8")

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
    expect(sitemap).toContain("<loc>https://looms.gg/piece/winter-coat</loc>")
    expect(sitemap).not.toContain("?tab=")
    expect(sitemap).not.toContain("?sort=")
  })

  it("home page: canonical, one h1, crawlable intro, JSON-LD, SPA intact", () => {
    expect(home).toContain('<link rel="canonical" href="https://looms.gg/" />')
    expect(home).toContain('<meta name="robots" content="index, follow" />')
    expect(home.match(/<h1>/g)?.length).toBe(1)
    expect(home).toContain("Custom Minecraft skins. No art skills needed.")
    expect(home).toContain('type="application/ld+json"')
    expect(home).toContain('"@type": "WebSite"')
    // SPA must still mount: root div + module script untouched
    expect(home).toContain('<div id="root"></div>')
    expect(home).toMatch(/<script type="module"/)
  })

  it("piece page: canonical, keyword title, JSON-LD, one h1, image alt + dimensions", () => {
    expect(piece).toContain('<link rel="canonical" href="https://looms.gg/piece/winter-coat" />')
    expect(piece).toContain("<title>Winter Coat — COAT Minecraft clothing piece | looms</title>")
    expect(piece.match(/<h1>/g)?.length).toBe(1)
    expect(piece).toContain("<h1>Winter Coat — Minecraft coat layer</h1>")
    expect(piece).toContain('alt="Winter Coat')
    expect(piece).toContain('width="180"')
    expect(piece).toContain('height="210"')
    expect(piece).toContain('"@type": "CreativeWork"')
    // Internal links: related pieces + look landing
    expect(piece).toContain('href="https://looms.gg/look"')
    expect(piece.match(/href="https:\/\/looms\.gg\/piece\//g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("prerendered content carries the Mojang disclaimer and DMCA/legal links", () => {
    expect(piece).toContain("not affiliated with, endorsed by, or sponsored by Mojang")
    expect(piece).toContain("Terms (DMCA / copyright contact)")
    expect(home).toContain("Community Guidelines")
  })

  it("static copy sits before the SPA root and is removed by an inline script", () => {
    const prerenderedAt = piece.indexOf('id="seo-prerendered"')
    const rootAt = piece.indexOf('<div id="root"></div>')
    expect(prerenderedAt).toBeGreaterThan(-1)
    expect(rootAt).toBeGreaterThan(prerenderedAt)
    expect(piece).toContain("removeChild")
  })

  it("JSON-LD blocks parse as strict JSON", () => {
    for (const html of [home, piece]) {
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
    execSync("node scripts/prerender-embeds.mjs", { cwd: ROOT, stdio: "ignore" })
    const rerun = readFileSync(path.join(DIST, "index.html"), "utf8")
    expect(rerun.match(/<h1>/g)?.length).toBe(1)
    expect(rerun.match(/rel="canonical"/g)?.length).toBe(1)
    expect(rerun.match(/name="robots"/g)?.length).toBe(1)
    expect(rerun.match(/application\/ld\+json/g)?.length).toBe(1)
    expect(rerun.match(/<div id="root"><\/div>/g)?.length).toBe(1)
  })
})
