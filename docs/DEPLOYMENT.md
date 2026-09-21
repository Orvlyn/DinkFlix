# DINKFLIX v2 deployment notes

## Exact sequence for the current server

1. Back up your current Custom CSS and JS Injector script.
2. Disable the old DINKFLIX/ElegantFin CSS import.
3. Paste `dinkflix.css` into Custom CSS.
4. Add `dinkflix.js` to JavaScript Injector as an authenticated script.
5. Hard refresh.
6. Verify Home, Movies, TV Shows, a movie detail page, a TV detail page, Search, and My List.
7. Re-enable Kefin Tweaks and test it separately.

## What should work without any extra plugin

- DINKFLIX navigation
- Recently Added hero
- Continue Watching
- Recently Added
- Movies
- TV Shows
- My List using Jellyfin favourites
- Detail-page My List button
- About page

## Optional integrations

### Jellyfin Enhanced

DINKFLIX does not depend on Jellyfin Enhanced, but its quality/rating/bookmark/Seerr capabilities can complement the DINKFLIX design.

When both provide the same visual metadata, avoid enabling multiple duplicate card-badge systems at once.

### Seerr / Jellyseerr

The v2 navigation will add a Requests entry when a native request/Seerr link is discoverable.

This keeps Seerr optional and avoids hardcoding a URL such as `localhost:5055` into the frontend.

### Home Screen Sections

Do not add this during the first deployment. DINKFLIX v2 owns the desktop home page in this foundation release.

## Rollback

If anything looks wrong:

- remove the v2 CSS from Custom CSS
- disable the `DINKFLIX Web v2` JS Injector script
- hard refresh

Your original Jellyfin interface should return.
