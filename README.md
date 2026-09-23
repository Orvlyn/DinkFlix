<div align="center">

<img src="https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/assets/logo_dark.png" alt="DINKFLIX" width="260" />

# DINKFLIX

**A cinematic, dark and premium visual experience for Jellyfin.**

[![Jellyfin](https://img.shields.io/badge/Jellyfin-12.x-00ffc6?style=flat-square&logo=jellyfin&logoColor=111111)](https://jellyfin.org/)
[![Build](https://img.shields.io/github/actions/workflow/status/Orvlyn/DinkFlix/release.yml?style=flat-square&label=build)](https://github.com/Orvlyn/DinkFlix/actions)
[![License](https://img.shields.io/github/license/Orvlyn/DinkFlix?style=flat-square)](LICENSE)

</div>

---

## The DINKFLIX experience

DINKFLIX is a custom visual redesign for Jellyfin, built around a cinematic dark interface, generous spacing, restrained typography and the signature mint accent **`#00ffc6`**.

The goal is to make Jellyfin feel more like a polished personal streaming platform without replacing Jellyfin itself. DINKFLIX is designed to work with Jellyfin's native navigation, authentication, libraries, playback, administration and plugin ecosystem wherever supported.

### Design direction

- **Premium dark interface** — a cinematic foundation designed for long viewing sessions.
- **DINKFLIX identity** — custom branding, logos, visual language and mint highlights.
- **Spacious layouts** — less visual clutter, clearer hierarchy and breathing room around content.
- **Refined typography** — cleaner, lighter text treatment instead of overly heavy fonts.
- **Cinematic media presentation** — redesigned hero areas, media rows, cards and detail-page styling.
- **Responsive experience** — layouts intended to remain usable across desktop, tablet and mobile screens.
- **Native Jellyfin foundation** — the project enhances Jellyfin rather than creating a separate streaming application.
- **Plugin-aware interface** — support for integrations and navigation elements provided by compatible Jellyfin plugins.

## Features and visual areas

DINKFLIX is an evolving theme and interface project. The current foundation includes work across the following areas:

- Custom DINKFLIX branding and visual styling
- Global dark theme and mint accent system
- Jellyfin header and navigation styling
- Home-page hero and content presentation
- Media rows, cards and metadata presentation
- Movie, series, season and episode detail-page styling
- Playback and media-control visual adjustments
- Responsive header behavior and mobile navigation support
- UI customization controls inherited from the SleekFin foundation
- Compatibility-focused integration with Jellyfin, SeerrFin and Jellyfin Enhanced navigation elements where available

Some features depend on the Jellyfin version, enabled integrations and the current state of development. DINKFLIX should be considered an active project rather than a guarantee of compatibility with every plugin combination.

## Required and recommended plugins

### Required

- **[File Transformation](https://github.com/IAmMrCarter/jellyfin-plugin-file-transformation)** — required for injecting the DINKFLIX frontend/theme assets into Jellyfin. Install and enable this plugin before expecting the visual changes to load correctly.

### Recommended / optional integrations

- **[Jellyfin Enhanced](https://github.com/JoelLaplante/jellyfin-enhanced)** — optional. Adds additional Jellyfin interface functionality and may provide navigation elements that DINKFLIX can integrate with.
- **[SeerrFin](https://github.com/arnesacnussem/jellyfin-plugin-seerr)** — optional. Useful if your Jellyfin setup uses Seerr for requests and related navigation links. DINKFLIX does not replace Seerr or require it for basic theme functionality.

> Plugin availability and compatibility can change as Jellyfin and third-party plugins are updated. Install only the integrations you actually use.

## Installation

### Add the DINKFLIX plugin repository

Add this manifest URL to **Jellyfin → Dashboard → Plugins → Repositories**:

```text
https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json
```

Then:

1. Open the **Catalog** tab.
2. Find **DINKFLIX**.
3. Install the latest available version.
4. Restart Jellyfin when prompted.
5. Make sure **File Transformation** is installed and enabled.
6. Refresh the Jellyfin web client, or clear the browser cache if the previous styling remains visible.

### Direct release download

The latest release packages are available here:

- **[DINKFLIX Releases](https://github.com/Orvlyn/DinkFlix/releases)**
- **[Latest DINKFLIX plugin package](https://github.com/Orvlyn/DinkFlix/releases/download/10.0.0.0/Jellyfin.Plugin.DINKFLIX_12.0.zip)**

DINKFLIX targets the Jellyfin 12.x plugin environment used by the current build. Confirm the target ABI and release notes before installing on a different Jellyfin version.

## Configuration

After installation, open the DINKFLIX plugin configuration page from the Jellyfin dashboard. Available controls depend on the current build and may include interface, header, hero and layout customization options inherited from the original foundation.

DINKFLIX is intended to enhance the existing Jellyfin experience. It does not manage your media files, replace your server, or require you to migrate your libraries.

## Credits and attribution

DINKFLIX is designed, maintained and developed by **Orvlyn**.

The project is based on **[SleekFin](https://github.com/varunaditya-plus/SleekFin)** by its original author and contributors. The SleekFin foundation, original implementation and applicable licensing requirements remain credited to the upstream project. DINKFLIX is a separate rebrand and modification, not a claim that the original SleekFin work was created by Orvlyn.

Additional dependencies and third-party integrations retain their respective authors, licenses and attribution requirements. Review the included [LICENSE](LICENSE) file and upstream projects before redistributing modified builds.

## Project status

DINKFLIX is an ongoing personal redesign project. The visual system, branding and frontend are being refined over time, with priority given to a premium appearance while preserving Jellyfin's native functionality and avoiding destructive changes to server libraries or settings.

Issues, compatibility reports and improvement ideas are welcome through the repository's [Issues](https://github.com/Orvlyn/DinkFlix/issues) page.

---

<div align="center">

**DINKFLIX — your server, your library, your streaming experience.**

</div>
