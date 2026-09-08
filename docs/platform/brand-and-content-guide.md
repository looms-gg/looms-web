# looms — Brand, Voice & Content Guide

Deep-dive companion to [master-briefing.md](master-briefing.md). The voice, visual system, copy patterns, and worked examples for AI-generated social posts, blog posts, and announcements. If an AI is writing *words* for looms, this is the doc it needs.

---

## 1. Brand identity

- **Name:** looms (lowercase always, except sentence start). Not LOOMS, not Looms.
- **Category:** "Free modular wardrobe for Minecraft skins" — the canonical one-liner.
- **Personality:** playful, collectible, **plaza-bright**. Social, closet-centric energy: characters are "residents of a closet."
- **Voice:** short, inviting, concrete. Real nouns (piece names, layer slots, wear, export), never marketplace hype. Dry humor is welcome — the catalog blurbs are genuinely funny.
- **Values:** free forever, community-shaped (Discord-first), creativity without art skills, safety without bureaucracy.

**The tone in practice** (real examples from the product):
> "Huge charcoal baggies. Your shoes are in there somewhere. Probably."
> "Pine sweater with a little red tree on it. Wear it in July. Start arguments."
> "Mud-brown crop. Short enough that your forehead can still participate."
> "You are a ginger bear now. Ears and everything. Mouth still works for snacks."

Pattern: state a visual fact, then land a dry punchline. Second person, casual contractions, deliberately un-cool phrasing that's cool *because* of it.

## 2. Taglines & copy hooks (canon)

| Context | Copy |
| --- | --- |
| Hero H1 | "Custom skins. **No art skills needed!**" |
| Hero sub | "Mix and match layered clothing, hair, and accessories into custom Minecraft skins. Free to style, export, and wear." |
| README | "Free modular wardrobe for Minecraft skins. Browse clothing layers, stack outfits in Studio, export a vanilla PNG." |
| Wardrobe tagline | "Saved characters and pieces you own." |
| Email confirmed | "You're in — the closet is yours." |
| Footer | "Free to style, export, and wear. Unofficial Minecraft fan project." |
| Community invite | "Got an idea? Join the Discord and tell us what you want to wear, browse, or fix!" |

Verbs that belong: browse, wear, stack, mix, save, export, style, dress, swap, layer.
Verbs that don't: buy, unlock, purchase, earn, spend, claim, win, limited, drop-exclusive.

## 3. Visual system (as shipped)

**The shipped UI uses a dark charcoal base with a neon-pink/magenta primary** (the design-source docs describe an earlier cyan system — the live CSS moved to pink; when in doubt, follow the shipped palette below).

### Colors (dark theme `looms`)
| Token | Value | Use |
| --- | --- | --- |
| base-100 | `#131418` | page background |
| base-200 | `#181a22` | panels |
| base-300 | `#20222e` | raised surfaces, tiles |
| content | `#ededf2` | text |
| primary | `#cf4878` | CTA pills, active nav, accents |
| secondary | `#a0305e` | secondary accents |
| info | `#dc5989` | info banners |
| success | `#16a34a` | confirmations |
| warning | `#f59e0b` | warnings, admin badge |
| error | `#f07068` | errors, destructive |

Light theme `looms-light`: base `#f3f1f8`/`#e8e6f0`/`#dddce8`, ink `#1c1c24`, primary `#0088ff`, secondary `#6b5ad4`.

### Shape & type
- **Pills everywhere** for actions and selected filters (999px radius); **18px tiles** for content cards; 10px inputs/fields; 12px buttons.
- One font: **Nunito** (400/600/700/800). Weight-first hierarchy; headlines 800 with tight tracking; never swap for Inter/Roboto/pixel fonts.
- Signature tile: 4:3 isometric 3D character render on a **computed complementary pastel background**, hard offset shadow, right rim light. Character preview is the product — never lead with text over art.
- Motion: 150–250ms, `cubic-bezier(0.22, 1, 0.36, 1)`; hover lifts one step (`translateY(-3px)` tiles); reduced-motion fully respected.
- Buttons: min-height 44px, 800-weight labels, `scale(0.96)` on press.

### Do / Don't (from the design law)
**Do:** keep the accent scarce; lead with clothing previews; use pills for actions/filters, tiles for content; `tabular-nums` for live counters; gutters `clamp(20px, 4vw, 48px)`, max width 1440px.
**Don't:** catalogue density (tiny thumbs, ad chrome); price chips (there are no prices); glassmorphism or gradient text; Creeper green; 1px border *plus* heavy blur shadow on one card; rounding past 18px (pills excepted); floating inspectors that hide the character.

## 4. Content grammar for AI writing

When generating posts about looms, use these mappings:

| Say | Not |
| --- | --- |
| pieces / layers | items, products, assets |
| wardrobe | inventory, locker, collection (unless quoting the feature) |
| Studio (capital S) | editor, workshop, creator tool |
| looks / outfits (saved combos) | designs, skins (a *skin* is the final exported PNG) |
| export a vanilla PNG | download your skin file |
| Classic (4px) / Slim (3px) arms | Steve/Alex (fine casually, but prefer the px terms) |
| makers | sellers, vendors |
| Discord community | fanbase, followers |

Facts to lean on: free forever, no ads, no account needed to browse, works on phone or laptop, export = upload to Java/Bedrock, remix layers instead of redrawing, hair/coat/shoes swap independently, 70+ built-in eyes with adjustable height, skin-tone bodies with a hue slider, community likes/comments/wear-this.

Hard rules for any generated content: never imply cost, scarcity, or buying; never promise a mobile app or offline mode; keep the "unofficial fan project, not affiliated with Mojang" caveat on anything press-like; Discord link is `https://discord.gg/UNTRgHBBPb`; site is `https://looms-gg.github.io/looms-web/`.

## 5. Worked examples

### Example social posts (X/Twitter-shaped, ≤280 chars)

> Your Minecraft skin doesn't have to be a compromise between "artist" and "default Steve."
>
> looms lets you stack real clothing layers — hair, coats, sneakers — and export a vanilla PNG. Free, no ads, no account needed to browse.
>
> https://looms-gg.github.io/looms-web/

> new on looms: wear this.
>
> see an outfit you like in Explore → hit Wear This → it loads straight into your Studio with every layer. swap the shoes, keep the coat, export.
>
> it's giving hand-me-downs, but digital. and free.

> 22 pieces of starter clothing. 70+ eye styles with height sliders. 8 skin tones with a hue dial.
>
> zero dollars. zero ads. zero "buy 400 Minecoins for this hat."
>
> looms.gg — the modular closet for Minecraft skins.

### Example Discord announcement

> **🧥 Wardrobe sync is live**
>
> Your closet follows you now. Save a look on your laptop, wear it from your phone — pieces and looks are stored on your account, not your browser.
>
> Also in this update: public looks + trending on the home page, profile pages at `/u/yourname`, and the light theme for daytime dressers.
>
> As always: free, no ads, and ideas go right here in #ideas.

### Example blog-post outline (SEO-friendly)

Title: *How to get custom clothes on your Minecraft skin without learning pixel art*
1. The problem: skins are all-or-nothing images; swapping one accessory means redrawing.
2. The layer idea: clothing as transparent 64×64 layers over a base skin.
3. Step-by-step with looms (browse → wardrobe → studio → export), 4 screenshots.
4. Mixing with your existing skin: why exports stay vanilla-compatible.
5. Community angle: wear trending outfits, like & comment, share your look URL.
6. Note: unofficial fan project, free forever, Discord link.

### Emoji & formatting conventions
- Emoji: sparing, warm, thematic (🧥 👕 🧢 👟 ✨ 🎨 🧍). No 🤑 💰 💎 (money/economy associations — the gems concept was removed deliberately).
- Headers in announcements use short bold lines, not ALL CAPS.
- Feature names capitalized exactly: **Explore, Wardrobe, Studio, Looks, My Uploads**.
- Numbers: use `tabular-nums` styling in product; in prose, spell small numbers, numerals for stats ("22 pieces", "70+ eyes").

## 6. Channel notes

- **Discord** is the town square — feature ideas, piece requests, UX feedback, bug chatter. Announcements can be casual and frequent.
- **GitHub** is developer-facing: PRs, code review, reproducible bugs. Keep marketing out.
- **Social (X/Twitter etc.)**: lead with the visual (tiles/renders are the brand), one idea per post, always the free hook. The isometric renders and the three-friend hero are the highest-signal images.
- **In-app** copy: sentence case, plain verbs, friendly but never cutesy-corporate; errors are humans ("Couldn't export that skin." → with a retry, never a stack trace).
