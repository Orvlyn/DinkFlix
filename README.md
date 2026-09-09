# DinkFlix

A cinematic, self-contained Jellyfin theme. No dependency on any other theme repo —
deep near-black glass, one neon-mint accent, a warm champagne highlight used sparingly
(stars, dividers, the wordmark), a serif display face for titles paired with a clean sans
for everything else, and restrained motion (ambient background drift, shine sweeps,
a breathing Play button) instead of static flat panels.

**Palette**

| | |
|---|---|
| Background | `#050810` |
| Surface | `#0b0f1c` |
| Accent | `#00ffc6` |
| Accent (deep) | `#00d1a3` |
| Champagne highlight | `#e8d9ab` |

**What makes it feel premium, not just "dark mode + one color":**
- Fixed ambient radial-glow + film-grain layer behind every page (`theme.css`) — flat solid backgrounds are what make free themes look cheap
- Serif (`Fraunces`) display type for titles/wordmark, gradient-shimmer text on the page title and login logo
- Glassmorphic surfaces everywhere (header, drawer, dialogs, login card, tag chips) — consistent blur + hairline border, never a flat solid fill
- Cards lift, glow and get a one-pass diagonal shine sweep on hover instead of just scaling
- Play button has a slow breathing glow to draw the eye — pauses on hover
- Nav drawer shows a gradient accent bar next to the selected item instead of a plain highlight
- Floating gradient orbs drifting behind the login screen

## Files

| File | Purpose |
|---|---|
| `colors/dinkflix.css` | Palette + gradients + glass/shadow tokens — load this **first**, everything else depends on it |
| `theme.css` | Core layout: ambient background, header, nav drawer, cards, buttons, player bar, dialogs, scrollbar, page fade-in |
| `login.css` | Cinematic glass sign-in screen with drifting gradient orbs and a shimmering wordmark |
| `extras.css` | Glass tag chips (quality/genre/rating/*arr links) + Jellyfin Enhanced plugin panel accents |
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

## Tuning it further

Every visual knob is a CSS variable in `colors/dinkflix.css` — tweak these without touching
the other files:

| Variable | Controls |
|---|---|
| `--dk-blur` | Glass blur strength (header, drawer, dialogs, login card) |
| `--dk-rounded` / `--dk-radius-lg` | Card / panel corner roundness |
| `--dk-noise-opacity` | Film-grain intensity (`theme.css` background) — set to `0` to disable |
| `--dk-gradient` | Accent gradient used on buttons, progress bar, nav indicator |
| `--dk-champagne` | The one warm highlight color (stars, dividers, footer text) |

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
