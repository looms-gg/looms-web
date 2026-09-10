# looms email templates

Transactional emails for Supabase Auth. Dark plaza world, Nunito, pink pill CTA —
rules in `docs/platform/brand-and-content-guide.md` §3.

## Files

- `_shell.handlebars` — shared 480px shell: wordmark header, 18px panel,
  dashed "thread" divider, fine print, footer. Copy this when adding a new email.
- `_content-confirm-signup.html` — Confirm signup content
- `_content-reset-password.html` — Reset password content

## Install

1. Open `_shell.handlebars`, replace `{{preheader}}` with the email's one-line
   preheader, and paste the chosen `<!-- CONTENT REGION -->` block in place of
   `{{content}}`. Write the `{{fineprint}}` line (see below).
2. Minify is optional; Supabase accepts raw HTML.
3. Supabase Dashboard → Authentication → Emails → pick template → source view →
   paste → Save. (Or `supabase` CLI config `auth.email.*` in `config.toml`.)
4. Send yourself a test via "Send test email" — check Gmail web, iOS Mail,
   Outlook desktop if available.

## Fine print copy

- **Confirm signup** (default):
  `You got this email because someone created a looms account with this address. Didn't sign up? You can ignore this email — the wardrobe only opens for people who confirm.`
- **Reset password** (default):
  `You got this email because someone asked to reset the password for this address. If it wasn't you, ignore it — your password stays as it was.`

## Rules when editing

- Accent pink appears exactly twice: the CTA and the fallback link. Nothing else.
- Never add a 1px border *and* a heavy shadow to the panel (design law).
- Copy: platform voice — warm, concrete, no hype. Banned verbs: buy, unlock,
  purchase, earn, spend, claim, win. Feature names capitalized: Explore,
  Wardrobe, Studio, Looks.
- Wordmark is served from `https://looms.gg/brand/looms-full.png` (copied from
  `src/assets/looms-full.png` at 600px). If the logo changes, re-export both.
