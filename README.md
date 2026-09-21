# DINKFLIX — Jellyfin 12.0/12.1

This repository contains two deliberately separate layers:

- `dinkflix.css` — the DINKFLIX theme. It styles Jellyfin's existing Web UI.
- `src/Jellyfin.Plugin.DinkFlix` — the DINKFLIX plugin. It registers the frontend through File Transformation and keeps Jellyfin's native services underneath.

The plugin does not replace Jellyfin routing, playback, context menus, search, user profile/preferences, Requests, or the dashboard.

## Installation

DINKFLIX is distributed as a normal Jellyfin plugin repository.

1. Open **Dashboard → Plugins → Repositories**.
2. Add this repository:
   `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`
3. Open **Catalog**, find **DINKFLIX**, install it, and restart Jellyfin.

Once the plugin is installed, **you do not need to paste an @import into Jellyfin Custom CSS**. DINKFLIX uses the File Transformation plugin to inject its embedded stylesheet and frontend into Jellyfin Web.

The stylesheet is the standalone DINKFLIX theme; it does not depend on ElegantFin or another theme.

## Plugin

Target: Jellyfin 12.x / .NET 10 / ABI 12.0.0.0.

The plugin includes:

- a cinematic DINKFLIX home page with hero, content rows, My List and six-card pagination
- the DINKFLIX navigation and detail presentation
- grouping of resumed TV episodes by series
- local estimated end time on details pages
- compact video/audio/subtitle information where Jellyfin already exposes it
- coloured rating, quality, HDR, age and genre/tag badges

Everything is always enabled. There is no DINKFLIX feature toggle page.

## Build

```bash
dotnet restore src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj
dotnet build src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj -c Release
```

CI performs the same build after static checks.
