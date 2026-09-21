# DINKFLIX Web 6.0.0

Desktop-first Jellyfin Web redesign for Jellyfin 12.1.

## What this release fixes

- No custom `?df=...#/home` routes.
- Movie and TV cards open the real Jellyfin `#/details?id=...` route, so the browser no longer lands on `Page not found`.
- Continue Watching collapses resumed TV episodes into one card per series and keeps the actual episode ID for Resume/Play.
- Home rows show six cards per page with previous/next controls instead of clipping a long row.
- The DINKFLIX navbar is fixed at the top of the browser viewport.
- Requests, Bookmarks, Search, Profile, Preferences and Dashboard use Jellyfin's real routes and are no longer hidden by the custom home shell.
- Playback uses Jellyfin's playback manager when available and falls back to the native Details Play/Resume control.
- Native player remains the playback engine; DINKFLIX only skins it lightly.
- Three-dot menu actions use Jellyfin APIs for user list, collection, playlist, download, delete, refresh and stream URL operations. Admin editor actions open the native Jellyfin editor so the real dialogs are used.
- Movie/series details include cast, directors, writers, genres, tags, ratings, quality, HDR, technical video/audio/subtitle information, external provider links, and optional streaming-provider availability.
- Series pages show season cards. Season pages show episode cards with thumbnail, episode number, runtime, rating, overview and play/menu controls.
- Movie/episode details show an estimated local end time based on the user's current browser clock and resume position.
- A server-side optional TMDB integration is included for watch-provider data. Provider availability is from TMDB/JustWatch and is only shown when a TMDB Read Access Token is configured in the DINKFLIX plugin settings.
- No ElegantFin import and no external runtime framework.

## Jellyfin dependencies

- Jellyfin 12.1 server/web.
- File Transformation 3.x.

JavaScript Injector is not required by DINKFLIX itself. Home Screen Sections is not required.

## GitHub upload

This package is intentionally a source replacement package for an existing DINKFLIX repository. Upload the contents to the repository root and commit them. Do not upload the ZIP itself and do not delete the repository first.

If the GitHub browser does not upload `.github`, do not touch the existing workflow. The package contains all source files required by the existing build workflow.

## Plugin settings

The DINKFLIX plugin settings page exposes:

- accent colour
- hero rotation interval
- optional TMDB Read Access Token
- TMDB watch-provider region (default AU)

The TMDB token is stored server-side in the DINKFLIX plugin configuration and is never embedded into the frontend JavaScript.
