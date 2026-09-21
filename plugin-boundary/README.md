# DINKFLIX plugin boundary — Stage 2

The plugin is intentionally NOT responsible for the normal Jellyfin web application.

## Theme owns

- visual design
- spacing
- typography
- colours
- cards
- navigation appearance
- home/library presentation
- detail-page presentation
- dialog/menu styling
- responsive styling

## Plugin owns

Only features that require application logic and cannot be achieved safely with CSS.

Candidates carried forward from the existing DINKFLIX requirements include:

1. Grouping Continue Watching by TV series instead of showing multiple resumed episodes from the same show.
2. A DINKFLIX-specific cinematic hero if it can be implemented without replacing Jellyfin's routing or home application.
3. Optional DINKFLIX-only enhancements that do not duplicate native Jellyfin features.

## Explicit non-goals

The plugin must NOT replace:

- Jellyfin routing
- Jellyfin playback
- Jellyfin search
- Jellyfin context menus
- Jellyfin profile/preferences
- Jellyfin administration
- Jellyfin's Requests/Seerr page
- Jellyfin's bookmarks page

The plugin should enhance those surfaces only where there is a clearly isolated, justified feature.
