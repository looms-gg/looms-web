# looms. Safety, Trust & Moderation Reference

Deep-dive companion to [master-briefing.md](master-briefing.md). Everything about how looms protects users, prevents abuse, handles data, and governs content. Useful for AI tasks involving safety policies, compliance answers, parental FAQs, trust-focused copy, or DMCA/enforcement workflows.

---

## 1. Governing philosophy

looms is built on one rule, stated in its engineering handbook: **client-side validation is user experience; server-side enforcement is security.** Every feature was threat-modeled before shipping, against six abuse vectors:

1. **Resource exhaustion / DoS**: unbounded inserts, storage flooding → answered by rate limits, quotas, size caps.
2. **Bot automation / scraping / Sybil**: scripted accounts, bulk scraping → signup constraints, per-action limits, query caps.
3. **State tampering**: faking counters or ownership → client-immutable counters, `auth.uid()`-scoped RLS everywhere.
4. **Stored XSS / injection**: malicious names, `javascript:` URLs, polyglot files → strict sanitization, URL protocol allowlist, PNG/MIME/dimension guards.
5. **BOLA / IDOR**: editing others' rows via ID guessing → RLS with explicit `auth.uid()` checks on every table; UUID keys; storage paths scoped to the uploader's own folder.
6. **Enumeration / info disclosure**: leaking private data or schema errors → private content invisible via RLS; error messages humanized before display; presence data isolated in its own table.

## 2. Rate limits & quotas (all server-enforced in Postgres)

| Action | Rate limit | Lifetime quota |
| --- | --- | --- |
| Upload garments | 15 / 10 min | 150 per account |
| Save/update looks | 30 / 10 min | 100 per account |
| Add to wardrobe | 60 / 10 min | 500 per account |
| Like | 60 / 10 min | 5,000 per account |
| Comment (either type) | 30 / 10 min | 2,000 per account |
| Profile updates | 10 / 5 min |, |
| Username change | 1 / 15 days |, |
| Texture upload | 15 / 10 min |, |
| Profile image upload | 20 / 10 min |, |
| File size (any upload) | 2 MB hard cap (bucket-level *and* trigger) |, |
| Comment nesting | 1 reply level |, |
| Report submissions | 10 / 10 min | 25 pending per user |

Additional hard rules: textures must be PNG at exactly 64×64 (dimension check client-side, extension/MIME/size server-side); profile images are png/jpg/jpeg/webp; every counter (`like_count`, `saved_count`, `added`) is unwritable by clients; `rate_limit_events` is fully revoked from clients.

When limits hit, the server raises errors that the client maps through `formatErrorMessage` into friendly, specific copy ("Upload rate limit reached. You can upload up to 15 garments every 10 minutes…"), clear feedback without leaking internals.

## 3. Moderation system

**User side:**
- Every signed-in user can **report** pieces, looks, comments, and profiles via a modal with five reasons: Inappropriate/NSFW, Spam/Advertising, Harassment/Abuse, Stolen Art/Plagiarism, Other rule violation, plus optional details (≤1000 chars).
- Reports are rate-limited (10/10min) and capped (25 pending) to prevent report-bombing.
- Users see only their own reports; admins see all.

**Admin side** (`/admin`, gated by a server-side `admin_users` table checked by an `is_admin()` SECURITY DEFINER function, the client allowlist is UI-only):
- **Moderation queue**: filter by status/type; resolve or dismiss reports with recorded `action_taken`, resolver ID, and timestamp.
- **Takedown powers** (enforced by RLS, not just UI): admins can delete/update any look, garment, or comment; authors can delete their own comments; content owners can delete comments on their own pieces/looks.
- **Latest activity feed**: newest looks, pieces, comments (both types merged chronologically), and profiles, for spotting patterns before reports arrive.
- **Site banner**: broadcast an announcement (info/accent/warning/neutral styling, optional labeled link, dismissible or sticky). Users can dismiss per-banner-version; admins manage the active banner.

**Community Guidelines** (in-app, `/guidelines`) draw the lines: allowed = original or properly licensed work + constructive feedback; not allowed = CSAM/sexual content involving minors, hate speech, harassment, impersonation, malware/deceptive textures, stolen IP, spam floods, illegal content. Enforcement ranges from content removal to upload limits to suspension. Reporting routes: Discord or email, with links/IDs encouraged.

## 4. Privacy & data

**Collected:** email, hashed password (by Supabase Auth), username, optional Minecraft username; user-created content (looks, garments) with metadata; browser-stored preferences (theme, cookie-consent record, dismissed banner, session). **That's the whole list, no analytics, no ads, no trackers, no third-party marketing cookies, no social login data.**

**Processors:** Supabase (auth, database, storage). Nothing else.

**Privacy controls users get:**
| Control | Mechanism |
| --- | --- |
| Hide "last seen" | `show_last_seen` flag; presence lives in a separate RLS-guarded table readable only for self or when allowed; updates throttled to 5 min |
| Hide likes | `show_likes` flag; RLS hides the likes rows from other visitors |
| Private looks/pieces | visibility fields enforced by RLS; private content and even commenting-on-private-targets is blocked server-side |
| Theme/consent | local-only, never synced |

**Privacy posture specifics:**
- Cookie banner: accept-all or reject-non-essential; today only essential storage exists (session, theme, consent record); re-openable via "Cookie settings" in the footer; documented in a `/cookies` policy page.
- `/privacy` page: what's collected, how it's used, processors, retention ("while your account exists, subject to quotas and abuse enforcement"), user rights (access/correct/delete/export via email contact; may verify account control), children under 13 (not directed; removal on request), change-notice via "last updated" date.
- The operator is a named individual (ser0th, United States), the docs are honest about being a solo operation, and the privacy contact email is currently a placeholder pending a real address.

## 5. Legal framework (all four docs live in-app)

- **Terms of Service** (`/terms`): free-service description, "not affiliated with Mojang/Microsoft. Minecraft is a trademark of Mojang Synergies AB," account responsibilities, **user content licensing** (users keep rights; looms gets a non-exclusive host/display/process license), upload-rights requirement, exports-for-personal-use language, as-is disclaimers and liability limits.
- **Privacy Policy** (above).
- **Cookie Policy** (`/cookies`): essential vs non-essential explained, how to change consent.
- **Community Guidelines** (`/guidelines`): allowed/not-allowed/enforcement/reporting.

One known gap, deliberately tracked in the docs themselves: the contact email in legal pages is a placeholder (`privacy@[TBD]`) pending a real address before the policies are "final."

## 6. Input hardening details (for security-minded writing)

- `sanitizeText` removes script/style/iframe element contents entirely, strips all tags, removes zero-width characters, bidi overrides (the `\u202A-\u202E`, `\u2066-\u2069` family), and ASCII control chars, then clamps length. Multiline mode normalizes newlines; single-line collapses them.
- `sanitizeUsername`: `a-zA-Z0-9_-` only, ≤30. `sanitizeMinecraftUsername`: `a-zA-Z0-9_`, ≤16 (Java rules).
- `sanitizeUrl`: parses with the URL API and accepts only `https:`/`http:`, kills `javascript:`, `data:`, and vbscript vectors for any user-supplied URL (avatar, banner, banner links).
- File upload path: type check → size check → dimension check (images decoded client-side to verify exactly 64×64 for textures) → client-compressed where applicable (profile images) → server re-checks size/extension/MIME → storage path must begin with the uploader's own UUID.
- Share URLs and OG injection are built from escaped templates; prerendered embed pages re-escape all metadata.

## 7. Suggested trust-copy facts (for FAQs/parents/press)

- looms has no ads, no trackers, no in-app purchases, and no chat/DM system; social interaction is limited to likes, comments, and public profiles.
- Email confirmation is required before an account can post anything.
- All user content is moderated on report, with an admin-only takedown system; the five report reasons and rules are public in-app.
- Personal data collection is minimal (email + username + optional Minecraft username) and is never sold; there are no advertising cookies.
- Exported skins are standard vanilla Minecraft PNGs for personal use; looms is an unofficial fan project unaffiliated with Mojang.
