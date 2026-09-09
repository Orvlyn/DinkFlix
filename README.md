# DinkFlix Theme

A Jellyfish-based color pack: background `#050810`, accent `#00ffc6`.

## Files
- `colors/dinkflix.css` — the color palette (variables only, same shape as Jellyfish's `colors/*.css`)
- `extras.css` — scrollbar, button glow, and Jellyfin Enhanced panel accent tweaks

## 1. Push this folder to GitHub

```powershell
cd f:\Jellyfin\dinkflix-theme
git init
git add .
git commit -m "DinkFlix theme"
git branch -M main
git remote add origin https://github.com/<your-username>/dinkflix-theme.git
git push -u origin main
```

(Create the empty `dinkflix-theme` repo on GitHub first — public repo, no README/license needed.)

## 2. Set Custom CSS in Jellyfin

Dashboard → General → Branding → Custom CSS Code (or edit `branding.xml`'s `<CustomCss>` directly, then **restart Jellyfin** for it to take effect):

```css
@import url("https://cdn.jsdelivr.net/gh/n00bcodr/jellyfish@main/theme.css");
@import url("https://cdn.jsdelivr.net/gh/n00bcodr/jellyfish@main/indicators.css");
@import url("https://cdn.jsdelivr.net/gh/n00bcodr/jellyfish@main/progress_bar.css");
@import url("https://cdn.jsdelivr.net/gh/<your-username>/dinkflix-theme@main/colors/dinkflix.css");
@import url("https://cdn.jsdelivr.net/gh/<your-username>/dinkflix-theme@main/extras.css");
```

Replace `<your-username>` with your GitHub username after pushing. jsDelivr picks up new commits within ~10-20 minutes (or use `@<commit-hash>` for instant, uncached updates while testing).

## Notes
- The Jellyfin **admin dashboard** pages (Settings/Plugins) cannot be themed via Custom CSS as of 10.11 — this is expected and by design. Only the main site (Home, library, player, item pages) is affected.
- Per-user "Disable server-provided custom CSS code" in Display Settings overrides all of this for that user — make sure it's off if the theme doesn't seem to apply.
