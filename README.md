# DinkFlix

Full standalone modern theme for Jellyfin Web.

- Background: `#050810`
- Accent: `#00FFC6`
- Clean typography
- Proper logo support
- Refined cards + hover
- Polished header, detail pages, player, dialogs

## Install

1. Upload `dinkflix.css` + `dnk.png` to the root of your public repo.
2. In Jellyfin go to **Dashboard → Branding → Custom CSS**
3. **Delete everything** currently in the box.
4. Paste only:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css?v=4");
```

5. Save and hard-refresh (`Ctrl + Shift + R`) or use an Incognito window.

## Notes

- This is a complete standalone theme. Do **not** import ElegantFin or any other theme at the same time.
- Custom CSS only applies to Jellyfin Web clients.
- Logo URL is hardcoded to `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dnk.png`

## License

MIT
