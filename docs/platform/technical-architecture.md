# looms — Technical Architecture Reference

Deep-dive companion to [master-briefing.md](master-briefing.md). Covers the stack, the skin engine, the data layer, backend enforcement, and deployment. Written so a technical reader (or AI) understands how looms actually works without reading the code.

---

## 1. Stack at a glance

| Layer | Technology | Notes |
| --- | --- | --- |
| UI | React 19 + TypeScript (strict) | Function components, context providers, no global store library |
| Build | Vite 8 | Base-path aware (`/looms-web/` for Pages), dev stays at `/` |
| Styling | Tailwind CSS 4 + daisyUI 5 | Two custom themes (`looms` dark default, `looms-light`); daisyUI stock themes disabled |
| Routing | React Router 7 | `BrowserRouter` with dynamic basename from `import.meta.env.BASE_URL` |
| 3D | skinview3d + three.js | Skin rendering, custom lighting rig, on-device thumbnail baking |
| Icons | FontAwesome (solid free set) | Thin `FaIcon` wrapper |
| Testing | Vitest + happy-dom | ~112 test files colocated with source; setup seeds a test catalog |
| Lint | oxlint | |
| Backend | Supabase | Postgres + Auth + Storage; types hand-owned in `src/lib/supabase.ts` |
| Hosting | GitHub Pages | `looms-gg/looms-web`, gh-pages branch serves `dist/` |
| Language | TypeScript everywhere; Python for asset scripts | OG generation, eye-whites scan, garment seeding |

**Monorepo layout (conceptual):**
- `src/data` — domain model: pieces, slots, bodies, eyes, outfit/stack logic, seed catalog JSON
- `src/skin` — the rendering engine: compositing, UV maps, model conversion, hue/wash, 3D camera & posing
- `src/state` — React contexts: auth, closet (wardrobe/looks), catalog, likes, comments, theme, cookie consent
- `src/pages` + `src/components` — routes and UI, grouped per surface (explore, wardrobe, studio, profile, piece, look, admin, moderation, auth, shell, ui, iso)
- `supabase/migrations` — 17 ordered SQL migrations; the DB is the security boundary
- `scripts` — asset pipeline (OG prerender is a build step; iso-saver is a dev-server plugin)
- `docs` — this pack, brand assets, threat modeling handbook, historical design specs/plans

## 2. The skin engine (the interesting part)

### 2.1 Domain model
- **Slot** (`eyes, hair, hat, face, shirt, coat, pants, shoes`) → belongs to a **body group** (`head, torso, legs`).
- **Stack order** is canonical: bottom→top = eyes, shirt, coat, pants, shoes, hair, face, hat. Users can reorder within rules; the DB `stack` array is the persisted z-order.
- A **Piece** carries optional `covers: Group[]` — a long-hair piece may paint head *and* torso; previews honor the actual paint.
- **Bodies** are 8 real base skins (Fair→Deepest) bundled as PNGs; default is `body-4` ("Tan").
- **Eyes** are system pieces (`eye-01`…`eye-71`) with a numeric offset suffix (`eye-42@-1`) shifting eye pixels vertically, clamped −3…+1.

### 2.2 Compositing (`src/skin/compose.ts`)
1. Start from the body texture on a 64×64 canvas; apply optional **OKLCH hue shift** to the body pixels (±120°, chroma damped so skin never goes neon).
2. For each garment in stack order: load its PNG, **normalize it to the target arm model** (see 2.3), then:
   - **Punch & lift**: for every inner/outer cuboid pair (head/hat, body/jacket, arms/sleeves, legs/pants), where the piece paints an inner-layer texel, clear the matching outer-layer texel on the destination and copy the piece's outer-layer paint forward. This makes higher layers correctly occlude lower ones in Minecraft's two-layer system. The head is special-cased: hat overlay copies inner-head pixels so hats read as solid shells.
   - **Blit** opaque pixels (alpha ≥ 8) over the composition.
3. Eyes get their offset applied to two fixed face regions after rasterizing.

### 2.3 Model conversion (`src/skin/convert.ts`)
- `detectSkinModel` inspects "Steve-exclusive" arm columns (opaque there = classic 4px, empty = slim 3px; no arm pixels at all = "universal" garment like a hat).
- `classicToSlim` drops the innermost arm column; `slimToClassic` edge-stretches 3px→4px. Conversion happens transparently during compositing, so **any garment works with either model**, and a look saved as one model renders correctly in the other.

### 2.4 Previews & thumbnails (`src/skin/iso.ts`, `focus.ts`, `heroPose.ts`)
- **IsoThumb pipeline**: compose skin → derive a "wash" (dominant-color analysis in OKLCH → complementary pastel background) → render in an offscreen 180×210 `SkinViewer` with a custom 3-light rig (warm key, cool fill, warm rim), nearest-neighbor filtering, no tonemapping, transparent background → auto-framed per content (hat → head close-up; pants → leg crop; long coat → torso crop; otherwise full figure) with posed limbs for depth → PNG data-URL.
- Jobs run through a **priority queue** (one render at a time), deduplicated by cache key (`piece:v57:…`, versioned so fixes invalidate), cached in memory and **IndexedDB** (`looms_iso_cache_v1`) for instant repeat visits.
- **Live stage** (Studio/piece pages): interactive turntable via `mountLiveViewer` — drag to spin, vertical angle locked, silhouette canvases copied each frame for the hard shadow + rim-light "punch" effect.
- **Hero poses**: three looks rendered as posed busts (center/left/right) with joint rotations and camera fitting that frames head+torso+arms; the Explore hero composites them leaning together.

### 2.5 The "wash"
`washFromPixels` buckets visible pixels by hue (24 buckets, chroma-weighted, alpha-aware), picks the dominant hue, and returns a **complementary pastel** in OKLCH (fixed lightness 0.91). Near-neutral outfits fall back to warm/cool pastels by lightness. This is why every tile's background subtly complements its outfit.

## 3. Data layer

### 3.1 Tables (all RLS-enabled)

| Table | Purpose | Notable columns / rules |
| --- | --- | --- |
| `profiles` | Account profile | unique username, mc username, bio, avatar/banner URLs, `show_last_seen`, `show_likes`, `username_changed_at`; auto-provisioned by `handle_new_user` trigger |
| `profile_presence` | last-seen timestamps | split from profiles so direct selects can't leak it; readable only for self or when `show_last_seen` |
| `garments` | clothing pieces (catalogue) | text id, slot CHECK (7 clothing slots), body_group, covers[], texture_url, is_public, saved_count/like_count (client-immutable), added (bigint ms) |
| `wardrobe_items` | ownership | PK (user_id, garment_id); insert requires the garment to be public or owned; uploads auto-join wardrobe via trigger |
| `looks` | saved outfits | stack[], body_id, body_hue, model, description, visibility CHECK, like_count (client-immutable) |
| `likes` | polymorphic likes | target_type garment/look, unique per (user,type,target); select visible for owner or when profile allows |
| `garment_comments` / `look_comments` | threaded comments | parent_id (one level), body ≤500, target-visibility guards, touch_updated trigger |
| `content_reports` | moderation queue | target look/piece/comment/profile, 5 reason ids, status pending/resolved/dismissed, resolved_by/at |
| `site_banners` | announcements | active flag, text ≤300, link ≤500, style info/accent/warning/neutral, dismissible |
| `admin_users` | admin allowlist | referenced by `is_admin()` SECURITY DEFINER function |
| `rate_limit_events` | internal limiter ledger | no client grants at all |

### 3.2 Client access
- `src/lib/supabase.ts` is the **single schema owner** (hand-written types, deliberately not generated; `npm run db:types` regenerates to /tmp for manual diffing).
- Lazy client facade — importing the module never constructs the client (tests can spy).
- Catalog loads public garments joined to maker usernames; private ones appear for their owner. Wardrobe/looks/comments/likes are straight CRUD guarded by RLS.
- Trending looks: `get_trending_looks_past_day(p_limit)` SQL RPC (security definer, granted to anon+authenticated) — likes in past 24h desc, then all-time likes, then recency.

### 3.3 Server-side enforcement (the security story)
Everything sensitive happens in **Postgres triggers + RLS**, never client-side:
- `check_rate_limit(action, max, window)` — sliding-window limiter on `rate_limit_events`, raises `P0001` when exceeded; opportunistic pruning.
- `check_user_quota(table, max)` — hard per-account ceilings.
- Counters (`like_count`, `saved_count`, `added`, `user_id`) are **client-immutable** via trigger guards; only triggers (using `set_config` flags) may change them.
- Storage triggers: 2MB cap, extension/MIME allowlists, upload rate limits, path must start with the uploader's own `auth.uid()`.
- Least-privilege: `SECURITY DEFINER` functions have locked `search_path`; RPCs revoked from public except the intended ones; `rate_limit_events` has zero client grants; TRUNCATE revoked everywhere.
- Uploads auto-wardrobe trigger; saved-count increments are lifetime (delete no longer decrements).

### 3.4 Client-side defense in depth
`src/lib/sanitize.ts` strips HTML/script/style/iframe tags, control & bidi-override characters, and clamps every field (`MAX_LIMITS`); username/mc-username character allowlists; URL sanitizer (http/https only) for avatar/banner/banner links; 2MB file validation; 64×64 dimension validation before upload; optimistic mutations roll back on error; every server error passes through `formatErrorMessage` which maps raw Postgres messages to friendly, non-leaking copy.

## 4. Frontend architecture patterns

- **Providers**: Theme → Auth → Likes → Catalog → Closet wrap the router. Closet is the heart: it merges server state (owned pieces, looks) with optimistic local updates and detects the "active look" by matching equipped layers.
- **Offline-first touches**: signed-out users get a local-only closet session; theme and cookie consent persist in localStorage; iso thumbnails persist in IndexedDB.
- **Auth flows**: unconfirmed sign-ins open a listening modal that polls `getUser()` every 4s and auto-unlocks; magic links; resend with 45s cooldown; `absoluteAppUrl()` bakes the Pages base path into every email redirect.
- **Routing**: basename derived from Vite `BASE_URL` so the same build works at `/` (dev) and `/looms-web/` (Pages); canonical/share URLs re-add the origin + base.
- **Testing**: colocated `*.test.ts(x)`; `happy-dom` environment; a shared setup seeds the catalog registry; pure domain logic (stack math, sanitizers, error formatting, quotas mapping) is heavily unit-tested; contexts and pages are component-tested.
- **The dev "iso-saver"**: a Vite middleware that accepts batched PNG renders and writes them to `public/iso/pieces/` — how the pre-baked isometric tiles shipped in `public/` were generated. `scripts/generate-og-assets.py` similarly builds per-piece OG images; `scripts/prerender-embeds.mjs` runs after `vite build` to emit SEO-ready static HTML per piece/look.

## 5. Deployment & operations

- **`deploy.command`** (one-click, human-owned): refuses if `.env` files would be committed; auto-commits on the current branch (attributing to the logged-in `gh` user, never AI tools); fast-forwards to `main`; pushes source; applies Supabase migrations via access token; `npm ci` + `npm run build`; copies `index.html` → `404.html` for SPA deep links; publishes `dist/` to the `gh-pages` branch via `gh-pages`; verifies Pages source config and triggers a rebuild.
- **Build pipeline**: `tsc -b && vite build && node scripts/prerender-embeds.mjs` — typecheck, bundle, then inject per-piece/per-look OG meta into static HTML copies.
- **Envs**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (browser-safe anon key only), `VITE_BASE` (custom-domain future = `/`), `SUPABASE_ACCESS_TOKEN` (CLI only, never shipped). Real secrets never enter the repo; the anon key is safe by design because RLS enforces everything.
- **Agent policy**: AI agents never commit — commits and deploys belong to the human.

## 6. Performance & scale characteristics

- Thumbnails are cached three ways (memory → IndexedDB → recomputation) and rendered one-at-a-time with lazy IntersectionObserver gating, so long grids stay smooth.
- Catalog loads once per session into a registry (`replaceCatalog`), O(1) lookups by id; filtering/sorting is client-side over the full list (fine at current scale, capped queries server-side).
- Every write is rate-limited and quota-capped server-side; the DB is the abuse boundary, not the client.
- Static hosting (GitHub Pages) means the app scales like a static site; Supabase carries dynamic load.
