# DinkFlix

A premium, dark cyan-accented Jellyfin theme built on the [ElegantFin](https://github.com/lscambo13/ElegantFin) framework by lscambo13.

- **Background:** `#050810` (near-black obsidian)
- **Accent:** `#00FFC6` (cyan)
- Full desktop, mobile, and TV layout support (inherited from ElegantFin)
- Custom forced header logo, cyan buttons/progress bars/focus rings/scrollbars
- Single self-contained CSS file — no JavaScript required

## Files

- [`dinkflix.css`](./dinkflix.css) — the complete theme. This is the only file you need.

## Installation

### Option A — Load from GitHub (recommended, auto-updates)

1. Push this repo to `https://github.com/Orvlyn/DinkFlix`.
2. In Jellyfin, go to **Dashboard → General → Branding**.
3. Paste the following into the **Custom CSS** box:

   ```css
   @import url("https://cdn.jsdelivr.net/gh/Orvlyn/DinkFlix@main/dinkflix.css");
   ```

4. Click **Save**, then hard-refresh your browser (Ctrl+Shift+R).

> jsDelivr caches the file for a few hours. If you push an update and don't see it, append `@main/dinkflix.css?v=2` (bump the number) to bust the cache, or wait for the CDN to refresh.

### Option B — Self-hosted / offline

1. Copy `dinkflix.css` to your Jellyfin server (e.g. next to your other custom assets).
2. Serve it via a static path reachable by your browser, or paste its full contents directly into **Dashboard → Branding → Custom CSS**.

## Replacing the logo

The header logo is forced via CSS to:

```
https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dnk.png
```

To use your own image, replace the `background-image` URL in the **"DinkFlix forced header logo"** section near the top of `dinkflix.css`, or upload your own `dnk.png` to the repo root.

## Customization

All colors are driven by CSS variables defined in `:root` at the top of `dinkflix.css`:

| Variable | Purpose |
|---|---|
| `--accentColor` | Primary cyan accent (buttons, focus rings, progress bars, hover states) |
| `--accentHoverColor` | Lighter cyan used on hover |
| `--darkerGradientPoint` / `--lighterGradientPoint` | Background gradient stops |
| `--osdSeekBarPlayedColor` / `--cardResumeProgressColor` | Progress bar fill colors |

Change `--accentColor` and `--accentHoverColor` to retint the whole theme without touching anything else.

## Credits

- Built on [ElegantFin](https://github.com/lscambo13/ElegantFin) by lscambo13 (MIT-style license terms carried over).
- DinkFlix modifications and branding by [Orvlyn](https://github.com/Orvlyn).
