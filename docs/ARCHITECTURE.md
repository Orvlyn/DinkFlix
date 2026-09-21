# Architecture

DINKFLIX Web has two layers.

## Server/plugin layer

The C# plugin is a normal Jellyfin plugin for Jellyfin 12.1. It exposes a small configuration page, serves embedded frontend assets and registers a File Transformation against `index.html`.

The File Transformation integration is intentionally reflection-based. This keeps DINKFLIX independent of a specific File Transformation binary reference while still using its public transformation interface.

The transformation adds two asset links to Jellyfin Web. The assets are served by the DINKFLIX plugin's controller.

## Frontend layer

The browser layer is framework-free JavaScript plus CSS.

It uses Jellyfin's existing `ApiClient` for authentication and media data. The custom frontend owns these desktop routes:

- Home
- Movies
- TV Shows
- My List
- Search
- Title details
- About

The native Jellyfin video player and administrative pages are intentionally left intact.

## Performance model

- No runtime UI framework
- Lazy images
- Small number of DOM observers
- Debounced route reconciliation
- CSS transform/opacity motion
- Limited blur
- Reduced-motion support
- No external runtime assets
