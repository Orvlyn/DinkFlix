# DINKFLIX — Jellyfin 12.0/12.1

This repository contains two deliberately separate layers:

- `dinkflix.css` — the DINKFLIX theme. It styles Jellyfin's existing Web UI.
- `src/Jellyfin.Plugin.DinkFlix` — the optional enhancement plugin. It only adds features CSS cannot provide.

The plugin does not replace Jellyfin routing, playback, context menus, search, user profile/preferences, Requests, or the dashboard.

## Installation

DINKFLIX is distributed as a normal Jellyfin plugin repository.

1. Open **Dashboard → Plugins → Repositories**.
2. Add this repository:
   `https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json`
3. Open **Catalog**, find **DINKFLIX**, install it, and restart Jellyfin.

Once the plugin is installed, **you do not need to paste an @import into Jellyfin Custom CSS**. The plugin loads the DINKFLIX stylesheet into Jellyfin Web itself.

The stylesheet is the standalone DINKFLIX theme; it does not depend on ElegantFin or another theme.

## Plugin

Target: Jellyfin 12.x / .NET 10 / ABI 12.0.0.0.

The plugin adds:

- grouping of resumed TV episodes by series
- local estimated end time on details pages
- compact video/audio/subtitle information where Jellyfin already exposes it

All three enhancements are optional in the plugin settings.

## Build

```bash
dotnet restore src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj
dotnet build src/Jellyfin.Plugin.DinkFlix/Jellyfin.Plugin.DinkFlix.csproj -c Release
```

CI performs the same build after static checks.
