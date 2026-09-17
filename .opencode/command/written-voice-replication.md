---
description: Draft and validate a looms blog post against the Nintendo voice corpus profile
---

Draft a new looms blog post and run it through the full voice pipeline. Topic: **$ARGUMENTS**

## 1. Gather the rules

Read these before writing anything:

- `/Users/fox/Documents/projects/looms-web/VOICE.md` — looms voice system (authoritative; wins on every conflict)
- `/Users/fox/Documents/projects/looms-web/docs/platform/brand-and-content-guide.md` — copy patterns, mappings, hard rules
- `/Users/fox/Documents/projects/looms-web/docs/platform/avoid-ai-writing.md` — word and structure rules for anything written *for* looms
- `/Users/fox/Documents/projects/looms-web/docs/platform/fact-sheet-and-faq.md` — every number must trace here; never invent facts
- `/Users/fox/Documents/projects/written-voice-replication/docs/analysis/24-style-specification.md` — the Nintendo voice profile, used as a tone lens ONLY

Precedence: looms VOICE.md overrides the Nintendo spec wherever they conflict (em dashes, contractions, sentence length, exclamation rate). The spec exists to keep the Nintendo-adjacent *tone* honest, not to turn looms copy into Nintendo newsroom copy.

## 2. Draft

Write the post (summary block first, then the full article) following the looms brand voice:

- Sentence case headings, warm plain voice, real nouns (piece, layer, wardrobe, look, Studio)
- Verbs from the lexicon; never buy/unlock/premium/limited
- Zero em dashes, varied sentence and paragraph lengths, no tier-1 AI words
- Keep the "unofficial fan project, not affiliated with Mojang" caveat on press-like material
- Structure: announce what and why early, elaborate in a few headed blocks, close by pointing somewhere (the three-move template from the Nintendo spec)

Save the draft to a file, e.g. `/var/folders/xt/vj9nx2q51q93r56k49j_jql80000gn/T/opencode/blog-draft-<slug>.md`.

## 3. Detect AI tells (deterministic)

```bash
node /Users/fox/.config/opencode/skills/avoid-ai-writing/skills/ai-writing-detector/scripts/detect.js --file <draft> --context general
```

Fix every finding, re-run until the score is 0 / Clean. Then run the manual audit from `avoid-ai-writing.md` (tier-1 words, em dash count, read-aloud pass).

## 4. Validate against the Nintendo voice corpus

```bash
python3 /Users/fox/Documents/projects/written-voice-replication/scripts/measure_draft.py <draft>
```

(run with workdir `/Users/fox/Documents/projects/written-voice-replication`; needs numpy/textstat/lexical_diversity, already installed on system python3)

Report the full table of measured vs target. Classify each row:

- **pass** — inside the Nintendo target band
- **deliberate divergence** — outside the band but required by looms VOICE.md (expected: FK grade, sentence length mix, negation rate, exclamation rate, contraction rate, em dashes). State the looms rule that wins.
- **off-profile** — outside the band and NOT explained by a looms rule. Fix these in the draft (e.g. comma rate far from 51–55/1k, MATTR outside 0.79–0.83, challenge-style sentences).

Apply fixes, re-run steps 3 and 4 until clean, and deliver the final post with the comparison table.
