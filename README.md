# Dinkflix

A lightweight, premium Jellyfin theme for Dinkflix / Orvlyn.

## Install

1. Upload this repository to `Orvlyn/dinkflix`.
2. Make sure `dnk.png` is in the repository root (or adjust the asset URL in `dinkflix.css`).
3. In Jellyfin Enhanced, use the raw GitHub URL for `dinkflix.css` with `@import`.
4. Hard refresh Jellyfin after saving.

## Recommended @import

```css
@import url("https://raw.githubusercontent.com/Orvlyn/dinkflix/main/dinkflix.css");
```

If your branch is not `main`, change the branch name.

## Design goals

- Dark, restrained, premium UI
- Minimal animation and paint-heavy effects
- No giant blur layers or animated backgrounds
- Subtle cyan/teal accent
- Responsive across desktop, TV and mobile
- Carefully scoped selectors where possible
- Uses the existing Jellyfin/Enhanced markup rather than adding JavaScript
