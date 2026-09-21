# Routing

DINKFLIX routes:
- `#/home` — home
- `#/dinkflix/library?viewId=...` — custom library
- `#/dinkflix/item?id=...` — title page
- `#/dinkflix/list` — My List
- `#/dinkflix/search?q=...` — search
- `#/dinkflix/about` — About DINKFLIX

Native public routes remain available:
- `#/home?tab=2` — Requests / Seerr
- `#/home?tab=3` — Bookmarks
- `#/search` — native search fallback
- `#/userprofile?...` — profile
- `#/mypreferencesmenu` — preferences
- `#/userpluginsettings.html?...` — plugin pages

Admin routes such as `#/dashboard` are left to Jellyfin.
