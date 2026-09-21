# DINKFLIX v2 architecture

## Layer 1 — Jellyfin

Jellyfin remains the media server, API, authentication system, media library and playback engine.

## Layer 2 — DINKFLIX CSS

`dinkflix.css` is the visual design system:

- colours
- typography
- spacing
- surfaces
- buttons
- card styling
- hero styling
- navigation
- detail-page polish
- accessibility/focus styles

## Layer 3 — DINKFLIX Web JavaScript

`dinkflix.js` owns the parts CSS cannot reasonably implement:

- custom navigation creation
- API-backed Recently Added hero
- hero rotation
- DINKFLIX homepage sections
- custom My List route
- favourite toggling
- detail-page My List action
- About route
- SPA route reconciliation

## Why this split

The existing DINKFLIX project is a very large ElegantFin-derived stylesheet. That is excellent for styling, but it becomes fragile when the design starts needing its own information architecture.

The v2 split lets the CSS stay focused while JavaScript handles small, targeted pieces of behavior.

## Why no framework

DINKFLIX's interactive surface is small enough that a framework is not necessary for the first version. Avoiding a frontend runtime keeps the browser payload and dependency surface smaller.

A future packaged plugin can use the same source without changing the design system.
