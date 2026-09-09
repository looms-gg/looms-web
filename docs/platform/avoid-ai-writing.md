# Avoiding AI Writing Tells

Style rules for anything written *for* looms: blog posts, social posts, Discord announcements, legal copy, docs. looms is a small, honest, human project, and the copy should sound like it. Two goals: sound like the platform voice in [brand-and-content-guide.md](brand-and-content-guide.md), and avoid the patterns that make text read as machine-generated.

> How to use: when asking an AI to write for looms, paste this doc along with the brand guide and ask it to follow both. When editing existing text, audit against the checklist. When in doubt, read it aloud; if it sounds like a press release or a chatbot, it needs another pass.

## The short list (P0: never publish these)

- Cutoff disclaimers: "As of my last update," "I don't have access to real-time data." Never publish a sentence that admits the writer didn't look something up. The [fact sheet](fact-sheet-and-faq.md) exists so there's always a source.
- Chatbot artifacts: "I hope this helps!", "Great question!", "Absolutely!", "Feel free to reach out."
- Vague attribution: "Experts believe," "Studies show." looms is a solo project; there are no experts to cite. State the claim or name the source (the code, the Discord, the terms doc).
- Significance inflation: "marking a pivotal moment," "a game-changer," "watershed." A beta web app shipping a feature is news to a Discord; it is not history. State what happened.

## Word rules

Replace on sight: delve, tapestry, realm, paradigm, embark, beacon, testament to, robust, comprehensive, cutting-edge, leverage (verb), pivotal, underscores, meticulously, seamless(ly), game-changer, utilize, nestled, vibrant, thriving, bustling, intricate, holistic, actionable, impactful, learnings, best practices, at its core, synergy, in order to, due to the fact that, serves as, boasts, features (verb), showcases, unpack, deep dive.

Flag in pairs (fine alone, suspicious together): harness, navigate, foster, elevate, empower, unleash, streamline, resonate, revolutionize, facilitate, underpin, nuanced, crucial, multifaceted, myriad, plethora, ecosystem (metaphorical), transformative, cornerstone, paramount, poised to, cultivate, illuminate, reimagine.

Flag at high density: significant(ly), innovative, effective(ly), dynamic, scalable, compelling, unprecedented, exceptional, remarkable, sophisticated, world-class.

Good replacements, looms-flavored: "harness" → "use"; "seamless" → name what's actually easy (no re-drawing, one tap); "robust" → name what holds up (server-side limits, RLS); "leverage" → "use"; "crucial" → "needed for X"; "comprehensive" → "full."

## Structural rules

- **Em dashes**: target zero. Replace with commas, periods, colons, or parentheses. Maximum one per 1,000 words, and only where a comma would genuinely misread.
- **"It's not X, it's Y"**: allowed once per piece, only if it carries a real contrast. Otherwise say the positive directly.
- **Bold**: at most one bolded phrase per major section. If a point matters, lead the sentence with it instead of bolding it.
- **Rule of three**: max one triad per piece. Two items, four items, or a sentence often lands better.
- **Hedging**: cut "perhaps," "potentially," "it's important to note," "to be clear." Say the thing.
- **Transition stack**: no "Moreover/Furthermore/Additionally" openers. If the connection isn't obvious, the sentences need reordering, not a connector.
- **Sycophancy and acknowledgment loops**: no "Great question!", no restating the question before answering, no recapping the previous section.
- **"Let's" transitions**: cut "Let's dive in," "Let's explore." If it's a genuine invitation in a Discord post ("Come tell us in #ideas"), that's fine; as a transition it's filler.
- **Parenthetical hedges** ("(and, increasingly, Z)"): give the aside its own sentence or cut it.
- **Rhetorical question openers**: "But what does this mean for players?" If you know, say it.
- **False ranges**: "from casual players to marketplace creators" means "everyone," which means no one. Name the actual audience.
- **Vague endearments to the future**: "The future looks bright," "only time will tell," "one thing is certain." Cut; end on something specific.
- **Numbered list inflation**: only when the content genuinely has that many parallel items.
- **Title case headings**: sentence case for headings; the product name "looms" stays lowercase anyway.
- **Title case for docs**: headings in these docs use sentence case; the product name stays lowercase.

## Rhythm rules

- **Vary sentence length.** Mix short (3–8 words) with long. Fragments are fine. "Free forever." is a complete sentence.
- **Vary paragraph length.** Some one sentence. Some four.
- **Repeat the right word.** "piece, piece, piece" beats "piece, item, garment, offering." (Exception in prose about the data model: "garment" is the technical term; use it there.)
- **Read-aloud test**: if text-to-speech wouldn't stumble anywhere, it's too uniform.
- **Keep a little roughness.** looms copy has dry wit in its UGC and warmth in its platform copy. Voice beats polish.

## looms-specific tells (from this platform's own context)

- **Don't paste UGC as brand voice**: piece blurbs are maker voice. Quoting one is fine in a social post with attribution; presenting it as looms copy is a category error.
- **Don't invent roadmap**: the fact sheet lists known gaps. "Coming soon" claims are fabrication unless the user said otherwise.
- **Don't invent numbers**: 22 seed pieces, 70+ eyes, 8 bodies, the limit table in [fact-sheet-and-faq.md](fact-sheet-and-faq.md). No invented player counts, no invented launch dates beyond the record.
- **Don't invent testimonials**: no "players are saying" without a real, attributed quote from Discord.
- **Don't imply affiliation**: no Nintendo branding or implication (tone only), and keep the Mojang disclaimer on press-like material.
- **Don't monetize by implication**: "upgrade," "unlock," "premium" have no referents here. There is nothing to buy.
- **Don't over-celebrate routine shipping**: "Now live: profile pages" beats "We're thrilled to announce our most requested feature ever."

## Worked example

**Before (AI-ish):**

> looms isn't just a skin editor — it's a comprehensive, seamless platform that empowers creators. Whether you're a seasoned skin artist or just starting your journey, looms offers a robust suite of tools. Moreover, with seamless exports and a vibrant community, your creativity knows no bounds. The future looks bright!

**After:**

> looms is a free closet for Minecraft skins. You browse clothing layers, stack them onto a character in Studio, and export a vanilla PNG that works in the game right away. No art skills needed. Free forever.

Diff: cut the false contrast, the "Whether you're" false breadth, the stacked intensifiers (comprehensive, seamless, robust, vibrant), the Moreover opener, and the generic conclusion. Four short sentences now carry the same facts. Facts went from zero to three.

## Checklist before publishing

1. Zero tier-1 words.
2. Em dashes: zero (or one per 1,000 words max).
3. No "Whether you're," "Moreover," "In today's," "worth noting."
4. No invented facts; every number traces to the fact sheet.
5. Sentence lengths vary; some paragraphs are one sentence.
6. The platform voice (warm, concrete, wholesome) is present; UGC quotes, if any, are attributed as maker voice.
7. Read aloud once. If any sentence sounds like a press release or a chatbot, rewrite it.

## Editing existing looms docs

When auditing text in this pack or in product copy:

1. Grep for tier-1 words first (fastest signal).
2. Count em dashes. If the count is high relative to length, sweep the file.
3. Check for the looms-specific tells above; those matter more here than generic style.
4. Preserve meaning, links, and every specific fact. Only style changes.
