<div align="center">

<img src="https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/assets/logo_dark.png" alt="DINKFLIX" width="220" />

# DINKFLIX

**A custom, premium Jellyfin experience by Orvlyn.**

[![Jellyfin](https://img.shields.io/badge/Jellyfin-12.x-00ffc6?style=flat-square&logo=jellyfin&logoColor=111111)](https://jellyfin.org/)
[![License](https://img.shields.io/github/license/Orvlyn/DinkFlix?style=flat-square)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/Orvlyn/DinkFlix/release.yml?style=flat-square&label=build)](https://github.com/Orvlyn/DinkFlix/actions)

</div>

---

## About

DINKFLIX is a personal rebrand and ongoing redesign of the SleekFin Jellyfin customization project. It keeps the original project's approach of enhancing Jellyfin's native web interface while introducing the DINKFLIX visual identity: a dark, spacious, modern interface with the signature mint accent `#00ffc6`.

This is intended to grow into a complete DINKFLIX experience over time. The current codebase is the foundation; future work will refine the interface, improve consistency, and expand the experience without replacing Jellyfin with a separate application.

## Current direction

- DINKFLIX branding and metadata
- Dark premium visual system
- Mint accent: `#00ffc6`
- Spacious layouts and restrained typography
- Custom header, hero, media, and detail-page styling
- Responsive desktop and mobile behavior
- Compatibility with Jellyfin's native navigation and supported plugins
- Configuration controls inherited from the original SleekFin foundation

## Installation

> **Build status:** This repository is under active development. Installable releases should be treated as testing builds until the GitHub Actions build and a real Jellyfin installation have both been verified.

1. Open the repository's **Releases** page.
2. Download the latest DINKFLIX plugin package when a release is available.
3. In Jellyfin, open **Dashboard → Plugins → Repositories** and add the DINKFLIX manifest URL when published.
4. Install the plugin and restart Jellyfin.

Repository: https://github.com/Orvlyn/DinkFlix

## Project structure

- `src/Jellyfin.Plugin.SleekFin/` — plugin and embedded frontend foundation
- `src/Jellyfin.Plugin.SleekFin/Inject/` — injected theme, components, and frontend assets
- `src/Jellyfin.Plugin.SleekFin/Frontend/` — frontend source code
- `manifest.json` and `meta.json` — plugin distribution metadata
- `.github/workflows/` — automated build and release workflow

The internal SleekFin namespace and folder names are being migrated carefully to avoid breaking embedded-resource paths, configuration compatibility, and Jellyfin integration points.

## Credits and attribution

DINKFLIX is maintained and developed by **Orvlyn**.

The project is based on **[SleekFin](https://github.com/varunaditya-plus/SleekFin)** by its original author and contributors. SleekFin's original design concepts, implementation, and applicable licensing remain credited to that project. DINKFLIX is a separate rebrand and modification, not a claim that the original SleekFin work was created by Orvlyn.

Additional project dependencies and acknowledgements remain documented in the source and applicable license files, including Preact, Inter, Lucide-derived icons, and File Transformation.

## License

See [LICENSE](LICENSE) for the repository license and review the upstream SleekFin project for its original licensing terms and attribution requirements.

## Development

DINKFLIX is being rebuilt in stages. Changes should preserve Jellyfin's native functionality, avoid destructive changes to user libraries or settings, and be tested against the target Jellyfin version before being considered release-ready.
