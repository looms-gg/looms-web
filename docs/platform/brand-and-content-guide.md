# looms. Brand, Voice & Content Guide

Deep-dive companion to [master-briefing.md](master-briefing.md). The voice, visual system, copy patterns, and worked examples for AI-generated social posts, blog posts, and announcements. If an AI is writing *words* for looms, this is the doc it needs.

---

## 1. Brand identity & voice

- **Name:** looms (lowercase always, except sentence start). Not LOOMS, not Looms.
- **Category:** "Free modular wardrobe for Minecraft skins", the canonical one-liner.
- **Personality:** warm, playful, collectible, **plaza-bright**: Nintendo-adjacent charm. The visual grammar borrows Mii-plaza energy (via ShareMii.net), and the voice follows: friendly console-era delight, rounded tiles, pill buttons, everyone's-invited optimism. Charming and polished, never snarky, edgy, or hype-y.
- **Voice:** short, inviting, concrete, and kind. Real nouns (piece names, layer slots, wear, export), simple sentences, gentle encouragement, small celebrations. looms copy should feel like a cheerful friend showing you their closet, not a brand selling something, not a meme account.
- **Values:** free forever, community-shaped (Discord-first), creativity without art skills, safety without bureaucracy.

### Platform voice vs. UGC voice (important)

looms is a **UGC platform**. Piece names and blurbs are written by makers and carry each creator's own personality, quirky, dry, meme-y humor and all. That's *their* voice, and it's welcome.

**Official platform copy never imitates UGC humor.** No sarcasm, no dark jokes, no slang-of-the-week, no punchlines at anyone's expense. The brand is the warm, polished host; the community supplies the spice.

**Real platform-voice examples from the product** (the register to emulate):

> "Wardrobe's still empty."
> "Add a hat, a coat, or an accessory in Explore to build your wardrobe."
> "You're in."
> "The closet is yours."
> "Wear a few layers in Studio and save the combo. It lands here."
> "This screen watches on its own, you can keep browsing while it waits."
> "Thank you for helping keep looms safe and creative."

**The pattern:** name the thing → say what happens next → celebrate the small win → invite the next step. Sentence case, contractions welcome, exclamation points rare and earned.

**One hard line:** "Nintendo-sorta" means tone only. Never imply Nintendo affiliation and never use Nintendo characters, assets, or trademarks, the same care the terms give Mojang applies here.

## 2. Taglines & copy hooks (canon)

| Context | Copy |
| --- | --- |
| Hero H1 | "Custom skins. **No art skills needed!**" |
| Hero sub | "Mix and match layered clothing, hair, and accessories into custom Minecraft skins. Free to style, export, and wear." |
| README | "Free modular wardrobe for Minecraft skins. Browse clothing layers, stack outfits in Studio, export a vanilla PNG." |
| Wardrobe tagline | "Saved characters and pieces you own." |
| Email confirmed | "You're in, the closet is yours." |
| Footer | "Free to style, export, and wear. Unofficial Minecraft fan project." |
| Community invite | "Got an idea? Join the Discord and tell us what you want to wear, browse, or fix!" |

Verbs that belong: browse, wear, stack, mix, save, export, style, dress, swap, layer.
Verbs that don't: buy, unlock, purchase, earn, spend, claim, win, limited, drop-exclusive.

## 3. Visual system (as shipped)

**The shipped UI uses a dark charcoal base with a neon-pink/magenta primary** (the design-source docs describe an earlier cyan system, the live CSS moved to pink; when in doubt, follow the shipped palette below).

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
- Signature tile: 4:3 isometric 3D character render on a **computed complementary pastel background**, hard offset shadow, right rim light. Character preview is the product, never lead with text over art.
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

Hard rules for any generated content: stay in **platform voice** (warm, wholesome, playful, no snark, no dark humor) even when quoting UGC, which may be quirkier; never imply cost, scarcity, or buying; never promise a mobile app or offline mode; keep the "unofficial fan project, not affiliated with Mojang" caveat on anything press-like, and never imply Nintendo affiliation either (tone, not branding); Discord link is `https://discord.gg/UNTRgHBBPb`; site is `https://looms.gg/`.

**Tone dial by context:**

| Context | Register |
| --- | --- |
| Hero, CTAs, onboarding | bright, welcoming, a little celebratory |
| Empty states & helper text | gentle nudges, zero guilt |
| Errors & rate limits | kind, specific, no blame ("Please wait a moment…") |
| Moderation & safety copy | plain, calm, honest |
| UGC spaces (piece blurbs, comments) | makers' own voice, the platform stays a friendly host, not a co-author |

## 5. Worked examples

### Example social posts (X/Twitter-shaped, ≤280 chars)

> Dressing up your Minecraft skin shouldn't require art skills.
>
> looms lets you stack clothing layers, hair, coats, sneakers, and export a vanilla PNG in minutes. Free to style, export, and wear.
>
> https://looms.gg/

> New on looms: Wear This ✨
>
> See an outfit you like in Explore? One tap loads it into your Studio with every layer ready. Swap the shoes, keep the coat, export your look.
>
> Your next favorite outfit might be hanging in someone else's closet.

> 22 starter clothing pieces. 70+ eye styles with a height slider. 8 skin tones with a hue dial.
>
> Everything free, no ads, and your export is a vanilla PNG that works in Minecraft right away.
>
> looms, the modular closet for Minecraft skins.

### Example Discord announcement

> **🧥 Your wardrobe follows you now**
>
> Save a look on your laptop, wear it from your phone, pieces and looks live on your account, so your closet is always with you.
>
> Also new: public looks and trending on the home page, profile pages at /u/yourname, and a light theme for daytime dressing.
>
> As always, looms is free, and your ideas shape what we build next. Tell us in #ideas!

### Example blog-post outline (SEO-friendly)

Title: *How to get custom clothes on your Minecraft skin without learning pixel art*
1. The problem: skins are all-or-nothing images; swapping one accessory means redrawing.
2. The layer idea: clothing as transparent 64×64 layers over a base skin.
3. Step-by-step with looms (browse → wardrobe → studio → export), 4 screenshots.
4. Mixing with your existing skin: why exports stay vanilla-compatible.
5. Community angle: wear trending outfits, like & comment, share your look URL.
6. Note: unofficial fan project, free forever, Discord link.

### Emoji & formatting conventions
- Emoji: sparing, warm, thematic (🧥 👕 🧢 👟 ✨ 🎨 🧍). No 🤑 💰 💎 (money/economy associations, the gems concept was removed deliberately).
- Headers in announcements use short bold lines, not ALL CAPS.
- Feature names capitalized exactly: **Explore, Wardrobe, Studio, Looks, My Uploads**.
- Numbers: use `tabular-nums` styling in product; in prose, spell small numbers, numerals for stats ("22 pieces", "70+ eyes").

## 6. Channel notes

- **Discord** is the town square, feature ideas, piece requests, UX feedback, bug chatter. Announcements can be casual and frequent.
- **GitHub** is developer-facing: PRs, code review, reproducible bugs. Keep marketing out.
- **Social (X/Twitter etc.)**: lead with the visual (tiles/renders are the brand), one idea per post, always the free hook. The isometric renders and the three-friend hero are the highest-signal images.
- **In-app** copy: sentence case, plain verbs, warm and encouraging, celebrate the small wins ("You're in." "The closet is yours.") and keep errors kind and specific ("Couldn't export that skin.", with a retry, never a stack trace). The platform is the cheerful host; UGC carries its own personality.
