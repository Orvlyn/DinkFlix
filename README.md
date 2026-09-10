# DinkFlix

Premium cyan recolor + branding layer for **ElegantFin**.

Keeps all of ElegantFin’s excellent layout, cards, detail pages, player and responsive work — then shifts the entire color system to a deep `#050810` background with `#00FFC6` accent and your logo.

## Install

In **Dashboard → Branding → Custom CSS** paste:

```css
@import url("https://cdn.jsdelivr.net/gh/lscambo13/ElegantFin@main/Theme/ElegantFin-jellyfin-theme-build-latest-minified.css");
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css?v=6");
```

Save and hard-refresh (`Ctrl + Shift + R`).

## What it changes

- Background → deep `#050810`
- Accent → cyan `#00FFC6` (buttons, progress, focus, indicators, hover)
- Logo → your `dnk.png`
- Scrollbars, card hover borders, and a few extra polish rules

Everything else (layout, spacing, animations, mobile/TV handling) stays ElegantFin.

## Files

- `dinkflix.css` — the override layer
- `dnk.png` — your logo (must be in the repo root)

## License

MIT (this layer only). ElegantFin remains under its own license.
