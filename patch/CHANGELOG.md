# Stage 2 — Theme Foundation

This patch replaces the current DINKFLIX application-style CSS with a native Jellyfin theme foundation.

## Intent

DINKFLIX now styles Jellyfin's UI instead of drawing a second application over it.

## Removed from the theme layer

- custom DINKFLIX application root
- route-cover / boot overlay ownership
- fixed full-screen app shell
- custom frontend navigation ownership
- custom playback surface ownership
- custom menu/dialog ownership

## Retained

- DINKFLIX dark graphite visual identity
- #00ffc6 accent
- premium card treatment
- roomy desktop layout
- detail page styling
- season/episode styling
- native scroller styling
- responsive desktop/mobile fallback

## Plugin work

Plugin functionality is intentionally separated. The next plugin stage should implement only the DINKFLIX-specific features that CSS cannot provide, beginning with Continue Watching grouping.
