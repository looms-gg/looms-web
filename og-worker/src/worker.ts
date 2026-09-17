/**
 * looms OG card worker — generates 1200×630 social cards on demand.
 *
 * GET /og/piece/<id>.png   → card for a public garment (Supabase `garments`)
 * GET /og/look/<id>.png    → card for a public look (Supabase `looks`)
 * GET /og/default.png      → shared fallback card (curated outfit)
 *
 * Design mirrors scripts/generate-og-assets.py: plaza-void canvas, soft wash
 * discs from the piece's own color, 18px stage tile with the piece render,
 * cyan-tint slot pill, Nunito 800 title, cyan creator, hairline footer.
 *
 * Pipeline: satori (JSX-like object → SVG) → resvg-wasm (SVG → PNG).
 * Cards cache at the edge via Cache-Control; cold render is the only cost.
 */

import satori from "satori"
import { Resvg, initWasm as initResvg } from "@resvg/resvg-wasm"
// wrangler's esbuild resolves .wasm imports into a pre-compiled
// WebAssembly.Module at bundle time (no runtime codegen).
import resvgWasmModule from "@resvg/resvg-wasm/index_bg.wasm"
import nunitoExtraBold from "../assets/Nunito-ExtraBold.ttf"
import nunitoSemiBold from "../assets/Nunito-SemiBold.ttf"
import {
  parseOgPath,
  sanitizeText,
  slotLabel,
  cardElement,
  fallbackResponse,
  OG_WIDTH as W,
  OG_HEIGHT as H,
} from "./pure"

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  SUPABASE_URL: string
  TEXTURE_BASE: string
  SUPABASE_ANON_KEY: string
}

type SatoriFont = { name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900; style: "normal" | "italic" }
let wasmReady = false

// Data-rule imports resolve to Uint8Array at bundle time (see [[rules]] in
// wrangler.toml) — no filesystem access needed in workerd or production.
function loadFonts(): SatoriFont[] {
  return [
    { name: "Nunito", data: toArrayBuffer(nunitoExtraBold), weight: 800, style: "normal" },
    { name: "Nunito", data: toArrayBuffer(nunitoSemiBold), weight: 400, style: "normal" },
  ]
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(data.byteLength)
  new Uint8Array(out).set(data)
  return out
}

async function ensureWasm() {
  if (wasmReady) return
  // resvgWasmModule arrives as a pre-compiled WebAssembly.Module (wrangler
  // esbuild wasm rule) — exactly what initWasm accepts; no runtime codegen.
  await initResvg(resvgWasmModule as unknown as Parameters<typeof initResvg>[0])
  wasmReady = true
}

type PieceData = {
  id: string
  name: string
  slot: string
  blurb: string | null
  saved_count: number
  texture_url: string
  maker: string
}

type LookData = {
  id: string
  name: string
  description: string | null
  stack: string[]
  maker: string
}

async function fetchPiece(env: Env, id: string): Promise<PieceData | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/garments?id=eq.${encodeURIComponent(id)}&is_public=eq.true&select=id,name,slot,description,saved_count,texture_url`
  const res = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as Array<Record<string, unknown>>
  const row = rows[0]
  if (!row) return null
  return {
    id: String(row.id),
    name: sanitizeText(row.name as string, 60),
    slot: String(row.slot ?? "shirt"),
    blurb: sanitizeText(row.description as string | null, 200),
    saved_count: Number(row.saved_count ?? 0),
    texture_url: String(row.texture_url ?? ""),
    maker: "creator", // TODO: join profiles.username when profiles are exposed
  }
}

async function fetchLook(env: Env, id: string): Promise<LookData | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/looks?id=eq.${encodeURIComponent(id)}&visibility=eq.public&moderation_state=neq.hidden&select=id,name,description,stack`
  const res = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) return null
  const rows = (await res.json()) as Array<Record<string, unknown>>
  const row = rows[0]
  if (!row) return null
  return {
    id: String(row.id),
    name: sanitizeText(row.name as string, 60),
    description: sanitizeText(row.description as string | null, 200),
    stack: Array.isArray(row.stack) ? (row.stack as string[]) : [],
    maker: "creator",
  }
}

/** Extracts a rough hue from the piece's texture PNG for the wash discs. */
async function washColorFromTexture(env: Env, textureUrl: string): Promise<string> {
  try {
    const res = await fetch(textureUrl)
    if (!res.ok) return "hsl(85 40% 55%)"
    const buf = await res.arrayBuffer()
    // Decode the 64x64 skin PNG. Worker runtime has no Image; use OffscreenCanvas.
    const bitmap = await createImageBitmap(new Blob([buf], { type: "image/png" }))
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(bitmap, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
    }
    if (!count) return "hsl(85 40% 55%)"
    r /= count; g /= count; b /= count
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    const l = (max + min) / 2 / 255
    const d = (max - min) / 255
    const s = max === min ? 0 : d / (1 - Math.abs(2 * l - 1))
    let h = 0
    if (max !== min) {
      if (max === r) h = ((g - b) / d) % 6
      else if (max === g) h = (b - r) / d + 2
      else h = (r - g) / d + 4
      h *= 60
      if (h < 0) h += 360
    }
    return `hsl(${h.toFixed(0)} ${Math.min(s * 100, 45).toFixed(0)}% 45%)`
  } catch {
    return "hsl(85 40% 55%)"
  }
}


async function renderPng(element: unknown): Promise<Uint8Array> {
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: loadFonts(),
  })
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    font: { fontFiles: [], loadSystemFonts: false },
  })
  return resvg.render().asPng()
}

async function fetchTextureAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? "image/png"
    if (!contentType.startsWith("image/png")) return null
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ""
    for (let i = 0; i < bytes.length; i += 8192) {
      const chunk = bytes.subarray(i, Math.min(i + 8192, bytes.length))
      for (const byte of chunk) binary += String.fromCharCode(byte)
    }
    return `data:image/png;base64,${btoa(binary)}`
  } catch {
    return null
  }
}

async function handlePiece(env: Env, id: string): Promise<Response | null> {
  const piece = await fetchPiece(env, id)
  if (!piece) return null
  const wash = await washColorFromTexture(env, piece.texture_url || `${env.TEXTURE_BASE}/${piece.id}.png`)
  const imageUrl = await fetchTextureAsDataUrl(piece.texture_url || `${env.TEXTURE_BASE}/${piece.id}.png`)
  const element = cardElement({
    title: piece.name,
    subtitle: `by ${piece.maker}`,
    creatorIsCyan: true,
    badge: slotLabel(piece.slot),
    badge2: `${piece.saved_count} SAVES`,
    description: piece.blurb || `${piece.name} is a community-made Minecraft clothing layer on looms.`,
    footer: "looms.gg",
    wash,
    imageUrl: imageUrl ?? undefined,
  })
  const png = await renderPng(element)
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  })
}

async function handleLook(env: Env, id: string): Promise<Response | null> {
  const look = await fetchLook(env, id)
  if (!look) return null
  const element = cardElement({
    title: look.name,
    subtitle: `${look.stack.length} layers  ·  Community Look`,
    creatorIsCyan: false,
    badge: "OUTFIT",
    description: look.description || `${look.name} is a community-made layered Minecraft outfit on looms.`,
    footer: "Free to style, export, and wear  ·  looms.gg",
    wash: "hsl(320 35% 55%)",
  })
  const png = await renderPng(element)
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const route = parseOgPath(url.pathname)

    if (route.kind === "piece" || route.kind === "look") {
      const { kind, id } = route
      await ensureWasm()
      try {
        const response = kind === "piece" ? await handlePiece(env, id) : await handleLook(env, id)
        if (response) return response
        console.error("OG fetch returned null for", kind, id)
        return fallbackResponse(route, url.origin)
      } catch (err) {
        console.error("OG render failed:", err instanceof Error ? err.stack : err)
        return fallbackResponse(route, url.origin)
      }
    }

    if (route.kind === "default") {
      await ensureWasm()
      const element = cardElement({
        title: "Winter Explorer",
        subtitle: "4 layers  ·  Curated Outfit",
        creatorIsCyan: false,
        badge: "OUTFIT",
        description: "Winter coat, converse shoes, dark sweatpants, and ink fall hair. Wear in Studio or export to skin.",
        footer: "Free to style, export, and wear  ·  looms.gg",
        wash: "hsl(320 35% 55%)",
      })
      const png = await renderPng(element)
      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
        },
      })
    }

    return fallbackResponse(route, url.origin)
  },
}
