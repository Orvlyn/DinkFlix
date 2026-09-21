# DINKFLIX — Jellyfin 12.1 Native Theme + Lightweight Plugin

This is the complete DINKFLIX architecture in one repository.

## What it is

DINKFLIX is a custom Jellyfin Web visual theme plus a small optional plugin for features that CSS cannot implement.

The theme is the file `dinkflix.css` and is intentionally self-contained. It does not import ElegantFin or any other theme, font, CDN stylesheet, or JavaScript framework.

Jellyfin remains responsible for:

- routing and page navigation
- playback and resume
- native three-dot/context menus
- search
- profile and preferences
- Requests / Seerr pages
- bookmarks and plugin pages
- administration

The DINKFLIX plugin only injects a small, defensive frontend enhancement script and never creates a second app shell or replaces Jellyfin's player/router.

## Jellyfin Custom CSS

In Jellyfin, use only this line in **Dashboard → Branding → Custom CSS**:

```css
@import url("https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/dinkflix.css");
```

The CSS is intentionally hosted in GitHub because Jellyfin loads external custom stylesheets on the client side. The client must be able to reach the raw GitHub URL.

## Plugin

The plugin targets Jellyfin 12 / .NET 10 and uses `IStartupFilter` to add its small frontend script to Jellyfin Web's existing `index.html` request. It does not require File Transformation, JavaScript Injector, ElegantFin, Home Screen Sections, or another DINKFLIX dependency.

The plugin has four saved settings:

- Enable frontend enhancements
- Group Continue Watching by TV series
- Show local estimated end time
- Show video/audio/subtitle summary

The configuration page uses Jellyfin's normal plugin configuration APIs rather than a custom settings storage system.

## Continue Watching behaviour

The optional enhancement finds native Continue Watching cards, asks Jellyfin for the corresponding item metadata, groups Episode items by `SeriesId`, keeps the first native card/action, and hides duplicate episode cards. The underlying Jellyfin item id remains the original episode id, so the native Play/Resume action is not replaced.

## Detail information

The optional enhancement can add:

- local estimated end time based on runtime and resume position
- video resolution / codec / HDR summary
- primary audio codec / channel / language summary
- subtitle count / language summary

It does not replace the native Jellyfin details page.

## Why there is no streaming-provider API in the core

Jellyfin supplies normal metadata such as title, year, genres, runtime, people, ratings and media streams. Third-party "where to watch" availability is a separate data source and is therefore not a core DINKFLIX dependency.

## Release

The repository contains a GitHub Actions workflow at `.github/workflows/publish.yml`.

1. Change `version` in `build.yaml`.
2. Commit and push.
3. Create a tag matching the version, for example `v7.0.0.1`.
4. The workflow restores against Jellyfin Controller/Model 12.0.0, builds for `net10.0`, packages the plugin, calculates its catalog checksum, creates the GitHub release, and publishes the generated manifest entry.

## Important migration note

This is a clean repository replacement. Do not leave the old DINKFLIX C# source or old custom `dinkflix.js` beside this version. Remove the old disabled DINKFLIX plugin installation once before installing the new release.

This rebuild has a new plugin GUID because the existing repository GUID was not available in the working environment used to produce this package.

The theme itself is independent of the plugin. If the plugin ever becomes disabled, the DINKFLIX CSS theme should continue to load normally through the GitHub `@import`.

## Verification performed in this environment

- JavaScript syntax check: PASS
- CSS delimiter / structural check: PASS
- C# lexical delimiter check: PASS
- JSON validation: PASS
- GitHub workflow YAML parse: PASS
- Cross-file version/ABI/framework checks: PASS
- No DINKFLIX application root in theme CSS: PASS
- No custom hash/history routing in enhancement JS: PASS
- No video element/player replacement: PASS
- No external theme import: PASS

The environment does not contain the .NET SDK and cannot reach GitHub, so a real `dotnet build` against NuGet and a live Jellyfin server smoke test cannot be honestly reported as completed here. The included GitHub Actions workflow is the actual compiler/release check for the target environment.
