# looms. Fact Sheet, Glossary & FAQ

Quick-reference companion to [master-briefing.md](master-briefing.md). Hard facts for checking AI output, plus a glossary and honest FAQ including known gaps. If an AI says something about looms, verify it here.

---

## 1. Hard facts (verified against the code)

### Identity & presence
| Fact | Value |
| --- | --- |
| Product name | looms (lowercase) |
| One-liner | Free modular wardrobe for Minecraft skins |
| Live URL | https://looms-gg.github.io/looms-web/ |
| Discord | https://discord.gg/UNTRgHBBPb |
| GitHub | https://github.com/looms-gg/looms-web |
| Operator | ser0th (individual, United States) |
| Repo age | First commits September 2026; open beta |
| Repo | Public, open source, PRs welcome |

### Product
| Fact | Value |
| --- | --- |
| Price | Free; no ads, no IAP, no trackers (an early "gems" concept was removed) |
| Output format | Vanilla 64×64 PNG skin (Java + Bedrock compatible) |
| Clothing slots | hair, hat, face, shirt, coat, pants, shoes (+ system-only eyes) |
| Body groups | head, torso, legs |
| Skin models | Classic (4px arms) & Slim (3px arms); garments auto-convert between them |
| Base bodies | 8 tones (Fair, Light, Warm, Tan*, Medium, Deep, Dark, Deepest). *Tan is the default |
| Body hue shift | ±120° OKLCH rotation |
| Bundled eyes | 70+ styles, adjustable vertical offset (−3…+1 px) |
| Seed catalog | 22 named pieces |
| Max texture upload | 2 MB, PNG, exactly 64×64 |
| Look saving | Named, private/public, ordered layer stack, overwrite confirmation |
| Sign-in | Email+password or magic link; email confirmation required for writes |
| Username rules | ≤30 chars, letters/digits/`-`/`_`; changeable once per 15 days |
| Profile extras | Avatar & banner upload (auto-compressed), bio ≤300, optional Minecraft IGN → minotar head avatar |
| Likes | One per account per piece/look; visible to others only if the profile allows |
| Comments | ≤500 chars, one reply level, on pieces and looks |
| Platform | Mobile-first web app; desktop is the "workbench," mobile gets a bottom dock |

### Platform & limits (server-enforced)
| Limit | Value |
| --- | --- |
| Garments per account | 150 (15 per 10 min) |
| Looks per account | 100 (30 per 10 min) |
| Wardrobe items | 500 (60 per 10 min) |
| Likes | 5,000 lifetime (60 per 10 min) |
| Comments | 2,000 lifetime (30 per 10 min) |
| Reports | 10 per 10 min, 25 pending |
| Profile updates | 10 per 5 min |
| Username change | 1 per 15 days |
| Comment depth | 1 reply level |

### Stack
| Component | Choice |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, daisyUI 5, React Router 7 |
| 3D | skinview3d + three.js (on-device rendering, IndexedDB-cached thumbnails) |
| Backend | Supabase (Postgres + Auth + Storage), 17 SQL migrations |
| Security | RLS + triggers + sliding-window rate limiter + quota functions (never client-trusted) |
| Hosting | GitHub Pages (SPA 404 fallback, base path `/looms-web/`) |
| Deploy | `deploy.command`: commit → push → migrations → build → prerender embeds → publish dist |
| Tests | Vitest + happy-dom, ~112 test files |
| SEO | Build-time prerendered OG/Twitter embeds per piece & look |

## 2. Glossary

| Term | Meaning |
| --- | --- |
| **Piece** | A single clothing layer (a hair, a coat…) in the catalog; the upload unit |
| **Garment** | The database/backend name for a piece |
| **Slot** | Where a piece goes: hair, hat, face, shirt, coat, pants, shoes (eyes are system) |
| **Body group** | head / torso / legs, which region a piece paints |
| **Covers** | The groups a piece's texture actually paints (long hair covers head+torso) |
| **Wardrobe** | Your account's collection of owned pieces + saved looks |
| **Studio** | The creator: pick a body, stack layers, adjust tone, save/export |
| **Look** | A saved outfit: ordered piece stack + body + tone + model, shareable when public |
| **Stack** | The ordered layer list; order = z-order of rendering |
| **Wash** | The computed complementary-pastel background behind every 3D tile |
| **Punch & lift** | The compositing algorithm handling Minecraft's inner/outer layer occlusion |
| **Classic / Slim** | Steve-style 4px arms / Alex-style 3px arms; garments auto-convert |
| **Vanilla PNG** | A standard Minecraft skin file, no custom client or mod needed |
| **Maker** | The creator of a piece |
| **Wear This** | Look-page action that loads someone's outfit into your Studio |
| **Saved count / like count** | Server-maintained counters (lifetime saves / current likes) |
| **Site banner** | Admin broadcast announcement across the app |
| **Presence** | last-seen info ("Active now"), gated by a privacy toggle |

## 3. FAQ

**Is looms really free?** Yes, every piece, every feature, every export. No ads, no accounts tier, no cosmetics paywall. The terms describe it as a free hobby project provided as-is.

**Do I need an account?** To browse, no. To own a wardrobe, save looks, like, comment, or upload, yes (email + password or magic link).

**Does the exported skin work in Minecraft?** It's a vanilla 64×64 PNG, so it uploads like any other custom skin on Java and Bedrock. No mods, no custom clients.

**Can I use my existing skin?** looms starts from its 8 base bodies with a hue slider. Layering onto arbitrary user-imported skins isn't a feature today.

**Who owns what I upload?** You keep your rights; looms gets a non-exclusive license to host/display/process the content so the service works. Details in `/terms`.

**Is it affiliated with Mojang?** No, explicitly an unofficial fan project, not endorsed by or affiliated with Mojang Studios or Microsoft.

**How is content moderated?** User reports (5 reasons) flow to an admin-only queue with resolve/dismiss/takedown actions; takedown powers are enforced at the database level. Community Guidelines are public in-app.

**What data does looms collect?** Email, username, optional Minecraft username, and the content you create. No ads, no analytics, no third-party trackers. Cookie policy in-app; consent banner included.

**Is there a mobile app?** No, but the web app is designed mobile-first with a bottom navigation dock.

**Can kids use it?** The privacy policy says looms is not directed at children under 13 (or the regional minimum), and requests contact to remove underage accounts.

**Why "looms"?** The name frames the closet/weaving metaphor, layers woven into a look. (The docs don't state an origin story; don't invent one in public copy.)

## 4. Honest gaps & known caveats (so AI output stays truthful)

- **Solo project:** one developer, no SLA; terms disclaim warranties and liability.
- **Legal contact placeholder:** the privacy/terms contact email is literally `privacy@[TBD]` pending a real address.
- **No monetization, no moat of scale:** no revenue model by design; Supabase free-tier realities apply to growth plans.
- **Discovery is early:** one flat feed; no follows, collections, tags UI (tags exist in schema only), or search beyond name/maker/slot.
- **Trending is heuristic:** pieces = savedCount × recency; looks = past-24h likes RPC with all-time/featured fallbacks. No anti-gaming heuristics beyond rate limits.
- **Base-body workflow:** you compose from looms bodies, not arbitrary imported skins.
- **No analytics:** growth insight currently comes from Discord/GitHub, not product metrics.
- **Custom domain:** anticipated (`VITE_BASE=/` support exists) but the app lives at `looms-gg.github.io/looms-web/`.
- **Embeds cover catalog + public looks:** profile/user pages don't get prerendered embeds yet.
- **Bedrock support is by artifact** (the PNG works), not by integration (no marketplace/custom-server features).

## 5. One-paragraph boilerplate (press-ready, safe)

> looms is a free, open-source wardrobe for Minecraft skins: browse community-made clothing layers, save any piece to your wardrobe, stack outfits on a 3D character in Studio, and export a vanilla 64×64 PNG that works instantly on Minecraft Java and Bedrock. No art skills, no ads, no paid unlocks, just dress up, remix, and wear. An unofficial fan project, unaffiliated with Mojang. https://looms-gg.github.io/looms-web/ · Discord: https://discord.gg/UNTRgHBBPb
