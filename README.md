# DinkFlix

A clean, modern, Netflix-inspired customization layer for **Jellyfin Web**, built on top of [ElegantFin](https://github.com/lscambo13/ElegantFin).

Designed to feel premium and restrained — deep dark backgrounds, soft cyan accent, refined cards, and minimal motion.

## Design

- Deep charcoal background (`#0A0D12`)
- Accent: `#00FFC6`
- Soft borders & elevated surfaces
- Clean typography hierarchy
- Restrained hover states
- Progress bars, buttons, dialogs, player OSD, and detail pages all tuned
- CSS-only — no JavaScript, no external fonts, no heavy effects

## Files

| File | Purpose |
|------|---------|
| `dinkflix.css` | Main theme (required) |
| `dinkflix-mobile.css` | Optional extra mobile polish |
| `dinkflix-tv.css` | Optional large-screen / TV polish |
| `dinkflix-import.txt` | Ready-to-paste Custom CSS |
| `LICENSE` | MIT |

Place your logo as `dnk.png` in the repository root.

## Installation

1. Create a public GitHub repository named **DinkFlix** under your account (or fork this one).
2. Upload these files + your `dnk.png`.
3. In Jellyfin go to **Dashboard → Branding → Custom CSS** and paste:

```css
@import url("https://cdn.jsdelivr.net/gh/lscambo13/ElegantFin@main/Theme/ElegantFin-jellyfin-theme-build-latest-minified.css");
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css");
```

4. Save and hard-refresh (Ctrl + F5) the client.

### Optional files

If you want the extra mobile/TV rules:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix-mobile.css");
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix-tv.css");
```

Load them **after** `dinkflix.css`.

## Important notes

- Custom CSS only applies to clients that use **Jellyfin Web**.  
  Native apps that do not use the web UI will ignore it.
- ElegantFin provides the solid base (responsive layout, cards, player, library views, etc.).  
  DinkFlix is a lightweight override layer for branding and polish.
- The logo URL is hard-coded to:
  `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dnk.png`  
  Update the `.headerLogo` rule in `dinkflix.css` if you change the filename or repository name.

## Updating

When ElegantFin releases a new build, the first `@import` will automatically pull the latest version.  
If a future ElegantFin update changes class names, some DinkFlix rules may need minor adjustments.

## License

MIT — see `LICENSE`.

ElegantFin remains under its own license and is loaded externally.
