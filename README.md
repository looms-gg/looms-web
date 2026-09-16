![looms](docs/brand/readme-banner.png)

**Free modular wardrobe for Minecraft skins.**  
Browse clothing layers, stack outfits in Studio, export a vanilla PNG.

**[Live site](https://looms.gg/)** · **[Discord](https://discord.gg/UNTRgHBBPb)**

looms is an unofficial Minecraft fan project. Not affiliated with, endorsed by, or sponsored by Mojang Studios or Microsoft. Minecraft is a trademark of Mojang Synergies AB.

---

## Got an idea?

looms is open source. Feature requests, piece ideas, and UX feedback belong in Discord — that is where the community shapes what we build next.

[Join the Discord](https://discord.gg/UNTRgHBBPb) and tell us what you want to wear, browse, or fix!

GitHub is for developers: pull requests, code review, and bugs that need a reproducible case.

---

## Docs


| Doc                                                             | What it covers                     |
| --------------------------------------------------------------- | ---------------------------------- |
| [PRODUCT.md](PRODUCT.md)                                        | Who looms is for and why it exists |
| [DESIGN.md](DESIGN.md)                                          | Visual system and UI tokens        |
| [VOICE.md](VOICE.md)                                            | Brand voice and tone               |
| [AGENTS.md](AGENTS.md)                                          | Contribution rules and code standards |
| [Threat modeling](docs/THREAT_MODELING_AND_ABUSE_PREVENTION.md) | Security and abuse prevention      |
| [Platform docs](docs/platform/README.md)                       | Deep-dive briefings: product, features, tech, brand |


---



## For developers

Stack: Vite, React, TypeScript, Tailwind CSS 4, daisyUI 5, Supabase.

```bash
npm install
npm run dev
npm test
npm run build
```

Copy `[.env.example](.env.example)` to `.env` (and/or `.env.local` for `VITE_*` keys). Deploy with `./deploy.command` after `gh auth login` — that pushes `main`, applies Supabase migrations, and publishes to GitHub Pages.

**Email confirmation links:** Supabase must allow the app's URL or sign-up links bounce to the wrong host (e.g. `localhost:3000`). In the Supabase dashboard → Authentication → URL Configuration:

- **Site URL:** `https://looms.gg/`
- **Redirect URLs** should include `https://looms.gg/**` and `http://localhost:*/**` (the app sends the current origin + base path with every auth email, so local sign-ups come back to local).

If the allowlist misses `https://looms.gg/**`, Supabase drops the app's `redirect_to` and the email link falls back to the Site URL — so a Site URL left at localhost from dev testing sends every confirmation to `localhost`. Symptom: clicking the email link opens a browser error page instead of the app. Fix both fields in the dashboard, and re-paste the email templates from `supabase/email-templates/` if a host was ever hardcoded into the dashboard copy (templates must only ever use `{{ .ConfirmationURL }}`).

PRs welcome. Talk through bigger ideas on Discord first so we are not building past each other!
## License

looms-web is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).

The admin skin editor at `src/editor/` is a port of [MineSkin PRO](https://github.com/hamza512b/mineskin) by hamza512b (AGPL-3.0), pinned at commit `98023b6ca269a26fe31fa5f3b03db00380a8eae6`.
