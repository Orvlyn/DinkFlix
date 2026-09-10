# DinkFlix

**Standalone** modern dark theme for Jellyfin Web.

Deep charcoal backgrounds, clean cyan accent (`#00FFC6`), refined cards, and a Netflix-inspired feel — without depending on ElegantFin or any other theme.

## Install

1. Make sure your repo is public: https://github.com/Orvlyn/DinkFlix
2. Ensure `dnk.png` is in the root of the repo.
3. Go to **Dashboard → Branding → Custom CSS**
4. **Delete everything** that is currently there.
5. Paste only this:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css?v=3");
```

6. Save and hard-refresh (`Ctrl + Shift + R` or Incognito window).

## Important

- This is a **standalone** theme. Do **not** import ElegantFin at the same time.
- Custom CSS only works on clients that use Jellyfin Web.
- The logo is loaded from: `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dnk.png`

## Files

- `dinkflix.css` — the full theme
- `dinkflix-import.txt` — ready-to-paste import line
- `dnk.png` — your logo (required)

## License

MIT
