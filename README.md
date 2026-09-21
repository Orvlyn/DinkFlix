# DINKFLIX — Jellyfin 12.0/12.1

This repository contains two deliberately separate layers:

- `dinkflix.css` — the DINKFLIX theme. It styles Jellyfin's existing Web UI.
- `src/Jellyfin.Plugin.DinkFlix` — the optional enhancement plugin. It only adds features CSS cannot provide.

The plugin does not replace Jellyfin routing, playback, context menus, search, user profile/preferences, Requests, or the dashboard.

## Jellyfin Custom CSS

Replace the entire Custom CSS field with:

```css
@import url("https://cdn.jsdelivr.net/gh/Orvlyn/DinkFlix@main/dinkflix.css?v=7.0.0.2");
```

The external stylesheet must be reachable by the browser/client. Jellyfin documents external CSS imports as supported, and community theme guidance commonly uses jsDelivr for GitHub-hosted themes.

For an update that is not appearing immediately, use a hard refresh. CDN caching can delay changes; a version/commit-pinned import is the most deterministic option.

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
