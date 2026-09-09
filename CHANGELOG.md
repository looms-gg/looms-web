# looms changelog

What's new, in plain words. Newest first.

## September 8, 2026: a faster, smoother looms

### The 3D stage keeps up with you

On the studio, piece pages, and look pages, the hard shadow and rim highlight now move with the character instead of catching up a beat later. The overlays are repainted on the same frame as the 3D render, so spinning or zooming the figure stays crisp from the first pixel.

### Explore scrolls like it should

The catalogue got a big tune-up under the hood. The signature tiles, your character with the hard shadow and the soft rim light, are now baked right into each picture instead of stacked from separate layers as you scroll. That means the Explore grid glides, even in Firefox, even on a busy phone.

The 22 starter pieces now use pictures that ship with the site, so they appear instantly instead of being drawn from scratch in your browser. And the 3D engine only loads when a page actually needs it, so looms gets moving faster on first visit.

Your character renders in the hero are remembered between visits too, so returning to Explore feels quicker than the first time.

### Looks keep all their layers

Fixed a bug where a saved look could show up missing a hat, or a coat, or whatever piece the page hadn't finished loading yet. Your saved stack is now the source of truth: if a slot looks empty, looms fills it in as soon as the piece arrives. No more half-dressed characters waiting for a refresh. "Edit outfit" in Wardrobe benefits from the same fix.

If the catalogue has trouble loading, looms quietly tries again a couple of times before giving up.

### Signing up is calmer

A few fixes for the email confirmation flow:

- The "waiting for you to confirm" screen checks in at a relaxed pace now, so it won't bump into rate limits while you find the email.
- The resend button waits 60 seconds between tries, which is what the email system actually allows.
- Rate-limit messages are more specific, so "please wait a bit" now says what to wait for.
- Confirmation links land on the right page no matter where you signed up, production or a local test.

### Report modal, restyled

The report dialog got a matching set: same rounded tiles, same warm scrim as the sign-up screens. Nothing new to learn, it just looks like it belongs. The site header stays visible behind it now, too.

### For the deploy crew

`deploy.command` now asks for a commit message before shipping, so the history reads like the work instead of a wall of timestamps.

### Behind the curtain

Added a set of internal briefings under `docs/platform/` covering the product, the tech, and the brand voice, and grew the test suite for outfits, auth, the catalogue, and thumbnails. Nothing changes for you, it just keeps looms honest as it grows.

---

As always, looms is free to style, export, and wear. Got an idea? [Tell us in Discord](https://discord.gg/UNTRgHBBPb)!
