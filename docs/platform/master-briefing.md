# looms Master Briefing

> Single-document context file. Paste this into any AI chat and the AI knows the whole platform. Deeper detail lives in the sibling docs in `docs/platform/`.

---

## 1. What looms is

looms is a **100% free modular character creator for Minecraft skins**. Think "dress-up closet for Minecraft": instead of hand-painting a skin in Photoshop, players browse community-made clothing layers, hair, hats, face pieces, eyes, shirts, coats, pants, shoes, add any of them to their wardrobe for free, stack them onto a base skin in a 3D Studio, and export a **vanilla 64×64 PNG** that works instantly on Minecraft Java and Bedrock.

- **Live site:** https://looms.gg/
- **Discord:** https://discord.gg/UNTRgHBBPb
- **GitHub:** https://github.com/looms-gg/looms-web (open source)
- **Operator:** ser0th, solo developer, United States
- **Status:** open beta, launched September 2026, actively developed

**Core loop:** Explore → add pieces (free) → Wardrobe → stack layers in Studio → export & wear in-game.

**The one non-negotiable rule:** the creator is free to style and export. Never mix real money, ads, paywalls, or e-commerce "buy" language into looms. No paid unlocks, no microtransactions, no Minecoin-style currency. (An early "gems" concept was prototyped and deliberately removed.)

## 2. Who it's for

Minecraft players who already make or wear custom skins. They open looms between sessions, on a laptop or phone, to browse clothing layers, save a combo, and leave with a skin they can actually wear. Five minutes ago they were in-game or scrolling screenshots; five minutes later they want a PNG ready to apply.

**The problem being solved:** customizing a Minecraft skin normally means pixel-art skills or digging through ad-choked catalog sites (Planet Minecraft, NameMC-style density) where a "skin" is an all-or-nothing image. looms treats clothing as **layers**, so a player composes a wardrobe instead of drawing, and remixes endlessly. Hair can be swapped without redoing the coat; shoes change without touching pants.

**Who it's not for (yet):** it's a web app account-based experience (email sign-up), so it targets players comfortable creating an account. It is not directed at children under 13.

## 3. The features, end to end

### Explore (home page)
- **Hero** with the tagline "Custom skins. No art skills needed!" and a signature visual: three 3D-rendered characters wearing trending outfits, posed leaning in together like friends ("hero pose" renders are generated on-device with skinview3d).
- **Two catalog tabs** via `?tab=` URL param:
  - **Pieces**: every clothing layer in the community catalogue. Search by name/maker/slot; filter by slot (Eyes, Hair, Hat, Face, Shirt, Coat, Pants, Shoes); sort by Newest, Trending (saved × age), or Most Saved.
  - **Looks**: outfits published by the community. Sort by Trending (likes in past day via a database RPC, falling back to all-time likes), Popular, Newest; filter by model (Classic 4px / Slim 3px arms).
- **Trending strip** in the hero surfaces the top 3 looks of the past day (featured defaults exist so the page is never empty).
- Every piece tile shows a 4:3 isometric 3D render (not a flat thumbnail), the piece name, and its maker. Tiles render on-device and are cached in the browser (IndexedDB) for speed.
- Auth-gated CTAs: "Upload Piece" and "Open Studio" open the sign-in modal for guests.

### Pieces
- Each piece has a detail page (`/piece/:id`) with the 3D preview, slot info, maker, save/like counts, and blurb.
- **Add to wardrobe** (free, unlimited by quota server-side), **wear it directly**, or both at once.
- **Likes** (one per account per piece), **threaded comments** (one reply level deep), **share links**, and **report** actions.
- Creator tools: the maker can rename/describe the piece inline, toggle public/private, upload a new texture version (cache-busted), or delete it.

### Wardrobe (`/wardrobe`, sign-in required)
The user's closet, three tabs:
- **Looks**: saved outfits as outfit tiles with layer counts; search; open an inspector to rename, describe, toggle public/private, download the skin, copy the share link, or jump back into Studio.
- **Pieces**: every owned piece, filterable by layer, searchable, with one-click wear.
- **My Uploads**: pieces the user created, with edit/delete/version-upload shortcuts.

### Studio (`/studio`, sign-in required)
The creator. Full-viewport three-panel layout (closet rack · 3D stage · layer list):
- **Pick a base body**: 8 skin-tone bodies (Fair → Deepest) that are real vanilla-compatible base skins.
- **Tone shift**: an OKLCH hue-rotate slider (±120°) re-tints the body in real time, so one body becomes dozens of tones.
- **Wear layers from the rack**: tabs auto-build from the slots you own; eyes are bundled system pieces (70+ built-in eye styles with per-style height offsets).
- **Layer stack control**: reorder the stack (a coat can sit over or under hair), clear slots, see the stack top-first.
- **Model toggle**: Classic (4px arms, Steve) or Slim (3px arms, Alex). Garments auto-convert between arm formats on render.
- **Save looks** (named, with overwrite confirmation), **download the PNG** (named after the look), all server-synced.

### Looks (`/look/:id`)
Public outfit pages: full 3D preview, maker, like button, "Wear this" (loads the whole outfit into your Studio), direct download, threaded comments, share link. Featured looks are seeded so the hero always has content.

### Profiles (`/u/:username`)
Public profile per account: avatar (custom upload or Minecraft-head from their linked Java IGN via minotar), banner, bio, Minecraft username, last-seen cue ("Active now", "3h ago", user-controllable privacy), and tabs for **Uploads**, **Looks** (public ones), and **Likes** (visible only if the user allows, or to themselves). Username changes are rate-limited to once per 15 days. Users upload avatars/banners (auto-compressed client-side) and manage privacy toggles.

### Accounts & auth
Email + password or magic-link (passwordless OTP) via Supabase Auth, with mandatory email confirmation (a modal listens and auto-unlocks when the link is clicked, you can keep browsing while waiting). Sign-up collects a username and optional Minecraft username (which drives the avatar head). Profiles auto-provision on signup.

### Community & social
- **Likes** on pieces and looks (server-enforced counters, optimistic UI).
- **Comments** on pieces and looks, threaded one level, rate-limited and sanitized.
- **Follows**? No, deliberately not yet. The social graph today is likes + comments + public profiles.
- **Trending**: pieces sort by saved-count × recency; looks use a past-24h like-count RPC.
- **Featured/default looks**: 3 curated "system" looks (Winter Explorer, Street Casual, Cyber Wanderer) guarantee the hero never looks empty.

### Discovery & sharing
- Every piece and look has a canonical share URL and a **prerendered HTML page with rich Open Graph/Twitter embeds**, so Discord/Twitter/X links unfurl with proper titles and images.
- OG images are prerendered per catalog piece; look pages share a default outfit embed.
- A dev-only "iso saver" plugin and Python scripts generate these assets locally.

### Admin & moderation
- `/admin`, restricted to a server-side admin table (plus a client allowlist for UI):
  - **Moderation queue**: content reports (5 reasons: NSFW, spam, harassment, stolen art, other) with resolve/dismiss/takedown actions.
  - **Latest activity**: real-time feed of newest looks, pieces, comments, and profiles.
  - **Site banner**: an announcement banner (info/accent/warning/neutral styles, optional link, dismissible) broadcast to all users.
- **Report flow** is available to every signed-in user on pieces, looks, comments, and profiles.

## 4. How the skin tech works (the magic)

This is the product's moat, worth understanding:

1. **Everything is a real Minecraft skin texture.** Each garment is a transparent 64×64 PNG authored in the standard Minecraft skin UV layout. The base bodies are real skins.
2. **Compositing is pixel-perfect layering in the browser.** Garment pixels are blitted over the body; transparent pixels let the layer below show through. A custom "punch and lift" algorithm handles Minecraft's two-layer rendering: when a higher piece paints an inner layer (e.g., hair under a hat), it punches matching texels out of the outer layer so it renders in front of clothes below, with a special case so hats read as solid shells over heads.
3. **Model conversion is automatic.** Classic (Steve, 4px arms) and Slim (Alex, 3px arms) skins have different arm UVs. looms detects the format from the arm pixels and converts garments either direction on the fly, so any garment works with either model.
4. **3D previews are rendered on-device** with skinview3d (three.js), custom-keylit, pixel-crisp, and auto-framed per piece (a hat tiles zooms to the head, pants to the legs, a long coat to the torso). Thumbnails are queued, cached in memory and IndexedDB, and turned into isometric PNG "punch-card" tiles with a computed complementary pastel background "wash" and a hard drop shadow, the site's signature tile look.
5. **Export is a single 64×64 PNG**: no watermark, no format conversion, vanilla Minecraft compatible immediately.

## 5. The platform & data model

- **Frontend:** React 19 + TypeScript + Vite 8, Tailwind CSS 4 + daisyUI 5, React Router 7, Phosphor Icons, skinview3d + three.js.
- **Backend:** Supabase (Postgres + Auth + Storage), all security in RLS + triggers (never the client).
- **Main tables:** `profiles`, `garments` (clothing pieces; the catalogue), `wardrobe_items` (user→piece ownership), `looks` (saved outfits with visibility), `likes` (polymorphic garment/look), `garment_comments` / `look_comments`, `content_reports`, `site_banners`, `admin_users`, `profile_presence` (last-seen), `rate_limit_events` (internal).
- **Storage buckets:** `garments` (textures, PNG-only) and `profiles` (avatars/banners), both path-scoped to the owning user's ID.
- **Hosting:** GitHub Pages with custom domain looms.gg (SPA with 404.html fallback, served at root), deployed by `deploy.command` which commits, pushes, applies Supabase migrations, builds, and publishes. Email confirmation redirects include the base path so signups work from production and localhost.
- **Quotas & limits (server-enforced):** 150 garments & 15/10min per account, 100 looks & 30/10min, 500 wardrobe items & 60/10min, 60 likes/10min & 5000 lifetime, 30 comments/10min & 2000 lifetime, 2MB max upload, PNG-only textures, 64×64 enforced client-side, one reply level, 15-day username cooldown, 10 reports/10min & 25 pending. Friendly error messages map every server limit to human wording.
- **Privacy posture:** no ads, no trackers, no analytics today; only essential storage (session, theme, cookie-consent record); cookie banner with accept/reject; last-seen hidden by user toggle (stored in a separate RLS-guarded presence table); likes visible only when the user allows; GDPR-friendly rights language; explicit "not affiliated with Mojang" terms.

## 6. Brand & voice

- **Personality:** warm, playful, collectible, "plaza-bright". Nintendo-adjacent charm. The visual grammar borrows Mii-plaza energy (rounded tiles, pill buttons, bright accent), and the voice matches: friendly, inviting, polished, wholesome. Encouraging without hype; cheerful without snark.
- **Voice:** short, inviting, and concrete: piece names, layer slots, wear and export, with small celebrations built in ("You're in." "The closet is yours.").
- **Platform vs. UGC (important):** looms is a UGC platform. Piece names and blurbs are written by makers in *their own* voices (often quirky/dry) and are not brand voice. Official copy stays warm, simple, and wholesome. The brand is the friendly host; the community supplies the personality.
- **Look:** dark charcoal UI ("night plaza") with a **neon-pink/magenta primary** (#cf4878) in the shipped theme; Nunito 800 headlines; 18px tiles; pill buttons; isometric character tiles with pastel washes. A light theme (`looms-light`) ships too. (The design-source doc describes an earlier cyan palette; the shipped CSS moved to the pink/magenta system.)
- **Anti-references:** catalogue-density skin sites, Roblox-shop neon + fake scarcity, Bedrock paid cosmetics, SaaS dashboards, pixel-font "gamer" templates, Creeper-green branding, glassmorphism.
- **Community:** Discord-first ("Got an idea? Join the Discord"), GitHub for PRs and reproducible bugs.

## 7. Positioning & honest differentiators

- vs **Planet Minecraft / NameMC**: looms is a creator, not a catalogue of whole skins; layered remixing instead of all-or-nothing downloads; clean, modern, ad-free UI.
- vs **Roblox / Bedrock marketplaces**: everything free, user-generated, export to vanilla Minecraft, no currency, no scarcity, no paywalls.
- vs **Novaskin / skin editors**: looms is dressing-up, not pixel-painting. "No art skills needed" is the promise. Layer logic (stacking, punching, model conversion) is handled for the user.
- **Honest caveats:** solo-maintained hobby project (terms say provided as-is); Bedrock export works as a vanilla PNG upload but there's no deep Bedrock integration; no mobile app (mobile web is first-class though); no follows/DMs; no analytics yet (growth is measured via Discord + GitHub).

## 8. Roadmap signals (from the code's direction)

Recently landed: public looks + trending, profiles with privacy controls, server-side security hardening, moderation system, admin banners, embeds/SEO prerender, light theme, eyes with height offsets, texture versioning. Natural next steps implied by the product: follows/collections, featured drops / outfit-of-the-week, search improvements (tags exist in the schema but are unused), localization, richer creator tools, and a custom domain (env already anticipates `VITE_BASE=/`).

## 9. Key numbers & facts (quick reference)

| Fact | Value |
| --- | --- |
| Price | Free, forever; no ads or IAP |
| Skin format | Vanilla 64×64 PNG, Java + Bedrock compatible |
| Slots | eyes, hair, hat, face, shirt, coat, pants, shoes |
| Body groups | head, torso, legs |
| Base bodies | 8 skin tones + OKLCH hue shift ±120° |
| Arm models | Classic (4px) & Slim (3px), auto-converted |
| Bundled eyes | 70+ system eye pieces with adjustable height |
| Seed catalogue | 22 named pieces (Ash Crop → Brown Shoes) |
| Max texture size | 2 MB, PNG only |
| Sign-in | Email+password or magic link, confirmation required |
| Platform | Web app (desktop + mobile web), no app install |
| Stack | React 19, TS, Vite 8, Tailwind 4, daisyUI 5, Supabase |
| Hosting | GitHub Pages at looms.gg |
| Moderation | User reports → admin queue; RLS-enforced takedowns |
