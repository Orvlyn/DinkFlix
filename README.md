# DinkFlix

A lightweight, self-contained Jellyfin theme. No dependency on any other theme repo —
everything needed lives in this one place: dark near-black backgrounds, a single neon-mint
accent, soft glass panels, and understated motion instead of loud gradients or busy textures.

**Palette**

| | |
|---|---|
| Background | `#050810` |
| Surface | `#0b0f1c` |
| Accent | `#00ffc6` |

## Files

| File | Purpose |
|---|---|
| `colors/dinkflix.css` | Palette variables — load this **first**, everything else depends on it |
| `theme.css` | Core layout: header, nav drawer, cards, buttons, player bar, dialogs, scrollbar |
| `login.css` | Glass sign-in screen matching the palette |
| `extras.css` | Optional Jellyfin Enhanced plugin panel accents (skip if you don't run it) |
| `LICENSE` | DBAD license (do what you want, just don't be a dick about it) |

## Install

### 1. Push to GitHub

```powershell
cd f:\Jellyfin\dinkflix-theme
git init
git add .
git commit -m "DinkFlix theme"
git branch -M main
git remote add origin https://github.com/Orvlyn/DinkFlix.git
git push -u origin main
```

### 2. Point Jellyfin at it

Dashboard → General → Branding → Custom CSS Code (or edit `branding.xml`'s `<CustomCss>`
directly and **restart the Jellyfin server** for the change to load):

```css
@import url("https://cdn.jsdelivr.net/gh/Orvlyn/DinkFlix@main/colors/dinkflix.css");
@import url("https://cdn.jsdelivr.net/gh/Orvlyn/DinkFlix@main/theme.css");
@import url("https://cdn.jsdelivr.net/gh/Orvlyn/DinkFlix@main/login.css");
@import url("https://cdn.jsdelivr.net/gh/Orvlyn/DinkFlix@main/extras.css");
```

jsDelivr caches by branch for ~10-20 minutes. While iterating on changes, swap `@main` for
a specific commit hash (e.g. `@a1b2c3d`) to bypass the cache instantly, or hit
`https://purge.jsdelivr.net/gh/Orvlyn/DinkFlix@main/theme.css` after pushing to force a refresh.

### Per-device instead of server-wide

Apply it only to your own account without affecting other users: Profile → Settings →
Display → Custom CSS Code, same four `@import` lines.

## Notes

- The Jellyfin **admin dashboard** (Settings/Plugins pages) cannot be themed via Custom CSS
  as of 10.11 — that's expected, Jellyfin blocks it by design. Only the regular site (Home,
  library, player, item pages) is affected by this theme.
- A user's own "Disable server-provided custom CSS code" (Display Settings) overrides
  everything server-side for that account — turn it off if the theme doesn't seem to apply.
- Editing `branding.xml` on disk while the server is running does **not** hot-reload —
  restart Jellyfin, or set the CSS through the Dashboard UI instead (applies immediately).

## Credits

Structure/approach inspired by [n00bcodr/Jellyfish](https://github.com/n00bcodr/Jellyfish)
(also DBAD-licensed) — colors, layout rules and login page are DinkFlix's own.
