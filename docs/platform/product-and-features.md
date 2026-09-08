# looms — Product & Features Reference

Deep-dive companion to [master-briefing.md](master-briefing.md). Covers every surface of the product, the exact flows a user goes through, the content model, and the state of each feature.

---

## 1. Sitemap & routes

| Route | Page | Auth? | What's there |
| --- | --- | --- | --- |
| `/` | Explore | No | Hero with trending looks, full piece & look catalogue |
| `/piece/:id` | Piece detail | No (actions gated) | 3D preview, wardrobe/like/comment/report/share, creator edit tools |
| `/look/:id` | Look detail | No (actions gated) | Full outfit preview, wear/download/like/comment/share |
| `/u/:username` | Profile | No | Avatar/banner/bio, uploads, public looks, likes (opt-in) |
| `/wardrobe` | Wardrobe | Required | Saved looks, owned pieces, my uploads |
| `/studio` | Studio | Required | The creator: rack, 3D stage, layer stack, save/export |
| `/privacy` `/terms` `/cookies` `/guidelines` | Legal | No | Four in-app legal documents |
| `/admin` | Admin panel | Admins only | Moderation queue, activity feed, site banner |

Global shell: sticky header (logo, Explore/Wardrobe/Studio pills, theme toggle, auth cluster), mobile bottom dock, toast notifications, site announcement banner, cookie banner, footer with legal links + Discord, and a full-screen email-verification modal flow.

The URL is the state for tabs: `/?tab=looks`, `/wardrobe?tab=pieces`, `/u/name?tab=likes` are all real, shareable URLs.

## 2. The content model

### Pieces (garments)
The catalogue unit. Each piece is:
- A **64×64 transparent PNG texture** drawn on the standard Minecraft skin UV map. Transparent pixels = "show the layer beneath."
- Metadata: name (≤50 chars), optional description (≤500), **slot** (hair/hat/face/shirt/coat/pants/shoes — eyes are system-only), **body group** (head/torso/legs), **covers** (which groups the texture actually paints — long hair can cover head+torso), maker, timestamps, saved/like counters, visibility, and tags (schema-ready, unused in UI yet).
- **Seeded catalogue**: 22 named launch pieces (Ash Crop hair, Winter Coat, Baggy Skull Pants, Knee-High Converse, Football Helmet, Anonymous Mask, Skull Mask, Christmas Sweater, camo & moon pants, sneakers…) with personality-rich blurbs. This is the "floor" content every visitor sees.
- **Bundled eyes**: 70+ system eye textures shipped with the app (sorted whites-first), each with an adjustable vertical offset (−3…+1 px) so eyes sit right on any face. Eyes are free to wear without "owning."

### Looks
A saved outfit: an ordered **stack** of piece IDs, plus body ID, body hue, model (classic/slim), name, description, and visibility (private/public). The stack order matters — it's the z-order of layers. Looks are the shareable, likeable, remixable unit of the community.

### Profiles
Username (30 chars, `-`/`_` allowed), optional Minecraft username (16 chars — used for the minotar avatar head), bio (≤300), avatar & banner images (client-compressed, ≤2MB), `show_last_seen` and `show_likes` privacy toggles, and a 15-day username-change cooldown.

## 3. Core user journeys

### Journey A — the 5-minute stranger
1. Lands on Explore. Sees three posed characters in trending outfits; "Custom skins. No art skills needed!"
2. Scrolls the piece grid, taps a coat → piece page with 3D preview.
3. Taps "Add to wardrobe" → sign-up modal (email/password, username, optional Minecraft IGN with live avatar-head preview).
4. Confirms email (modal listens in background; "I'll confirm later" keeps them browsing).
5. Wardrobe → Studio: picks a body tone, wears the coat, adds hair, adjusts eye height.
6. Exports `winter-look.png`. Uploads to Minecraft. Done in minutes, cost $0.

### Journey B — the community member
1. Saves and names looks in Studio; toggles one public.
2. Their look appears in Explore → Looks (Newest/Trending/Popular).
3. Others like, comment, and hit **"Wear this"** — which loads the exact outfit into their own Studio.
4. Their profile shows uploads + public looks; they upload a custom avatar & banner.

### Journey C — the creator
1. Paints a garment in any pixel editor on the 64×64 Minecraft template (transparent where skin shows through).
2. Uploads via "Upload Piece": PNG → slot picker → visibility → publish. Server validates type/size/dimensions; the texture lands in storage keyed `userId/pieceId.png`; the row lands in `garments`; the piece auto-joins their wardrobe.
3. Sees it in Explore, gets likes/saves, can replace the texture with a new version anytime (cache-busted URL) or flip it private.

## 4. Feature deep-dives

### Explore
- **Hero**: headline, subcopy, "Open Studio" + "Join Discord" CTAs, and the signature **three-friend pose** — trending looks rendered as posed 3D busts (center with arm around the left friend), auto-composed on-device. Mobile gets a 3-tab switcher.
- **Search**: name/maker/slot text match, 80-char cap.
- **Sorting (pieces)**: Newest (upload timestamp), Trending (savedCount × recency), Most Saved.
- **Sorting (looks)**: Trending (DB RPC `get_trending_looks_past_day` — likes in the last 24h, then all-time likes, then recency), Popular, Newest; model filter Classic/Slim.
- **Filter rail** (desktop): sticky left column with mode switch (Pieces/Looks), sort and slot lists with a sliding pill highlight; collapses on mobile.
- Empty/error/loading states everywhere, with skeleton "bone" shimmer animation.

### Wardrobe
- **Looks tab**: outfit tiles (layer counts, public badge behavior), search, inspector modal (rename inline, description, public toggle, download, share link copy, edit-in-Studio).
- **Pieces tab**: every owned piece with layer filter + search and one-click wear. Ownership is a real server row (`wardrobe_items`), synced across devices.
- **My Uploads tab**: quick access to creator tools — inline rename/describe, public/private toggle, "upload new version," wear-in-studio, two-step delete.
- Adding a piece is idempotent (dup-safe), optimistic in the UI, and synced to the DB; the server maintains lifetime saved-counts via triggers.

### Studio
- **Three panels**: wardrobe rack (tabs per slot you own + "all" + appearance), the 3D stage, and the layer stack list (top-first, reorder buttons, clear-slot).
- **Appearance**: 8 base bodies as clickable tone swatches; tapping the active swatch opens the **hue slider** (±120° OKLCH rotation with chroma damping so skin never goes neon); eye-height control when eyes are worn; model toggle Classic/Slim.
- **The stage**: live turntable 3D (drag to spin, polar angle locked), soft key/fill/rim lighting, crisp nearest-neighbor textures, hard drop-shadow + rim "punch" effects composited from the canvas silhouette.
- **Save flow**: name sanitization, duplicate-name detection → overwrite confirmation (Overwrite / Save as new / Cancel), optimistic list update, server sync.
- **Export flow**: composes the final skin, triggers a download named after the look, toast on failure.
- Studio locks page scroll and takes the full viewport height (desktop); mobile keeps a bottom-dock-safe layout.

### Likes & comments
- One like per account per target; optimistic toggle with rollback on failure; server triggers keep `like_count` honest and client-unwritable.
- Comments: 500 chars, sanitized (tags/scripts/unicode controls stripped), threaded one level deep (server-enforced), edit/delete by author, delete by content owner or admin, rate-limited 30/10min.
- Both work identically on pieces and looks.

### Sharing & embeds
- Canonical URLs on the production origin with the correct base path; copy-to-clipboard with fallback.
- **Build-time prerendering**: `piece/<id>/index.html` for every catalog piece and `look/<id>/index.html` for public looks, each with per-item Open Graph + Twitter meta. Discord/Twitter unfurls show the real piece name and OG art. `404.html` fallback keeps SPA deep links working on GitHub Pages.

### The system "wash" and tile look
Every isometric tile computes a **complementary pastel background** from the outfit's dominant colors (OKLCH hue analysis), with a hard offset shadow and right-side rim light baked from the render itself. This is the signature visual language of the catalogue — tiles feel like collectible cards of *your* character.

## 5. Auth & account details

- Modes: password login, sign-up (email, password ≥6, username, optional Minecraft IGN), magic-link OTP.
- Email confirmation is **mandatory before the account is usable** for writes; the verification modal polls every 4s and auto-detects confirmation ("You're in" flash), with a 45s resend cooldown.
- Confirmation links redirect to the current origin + app base path (works from production, localhost, or any deployment).
- Profiles are auto-created on signup via a DB trigger (username from metadata or email prefix).
- Sessions persist and auto-refresh; sign-out clears local state immediately.
- Last-seen updates are throttled to 5 minutes (client + server) and only while the tab is visible.

## 6. Personalization & privacy controls

| Control | Where | Effect |
| --- | --- | --- |
| Show last seen | Profile settings | Hides presence from others (separate DB table enforces it) |
| Show likes | Profile settings | Hides the Likes tab from other visitors |
| Look visibility | Wardrobe/Look inspector | Private looks never appear publicly |
| Piece visibility | Upload inspector | Private pieces are only yours (comments blocked on them too) |
| Theme | Header toggle | Dark `looms` / light `looms-light`, remembered |
| Cookie consent | Footer → Cookie settings | Re-open the accept/reject banner anytime |

## 7. Feature maturity snapshot

**Solid / shipped:** catalogue browsing & filtering, wardrobe sync, studio layering + tone shift + model toggle + eyes, export, public looks + trending, profiles, likes, comments, uploads with versioning, reports + admin moderation, site banner, embeds/SEO, light theme, cookie consent, legal docs.

**Present but early:** tags (schema only), trending is simple heuristics, discovery is one flat feed (no follows/collections yet).

**Deliberately absent:** monetization of any kind, ads/trackers, follows/DMs, analytics, mobile apps, Bedrock-specific integrations (though exports work fine there), multiplayer/realtime features.
