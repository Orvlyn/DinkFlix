# DINKFLIX

A premium dark, cinematic Jellyfin theme and UI enhancement plugin maintained by **Orvlyn**.

DINKFLIX focuses on the Jellyfin web experience: the header, home hero, media cards, detail pages, episode browsing and playback presentation.

## Features

- DINKFLIX branding and mint accent
- Hero carousel with clickable slide indicators
- Continue Watching removal that uses Jellyfin's resume-exclusion behavior
- Rich media details: video, subtitles, genres, director, writer and studio
- TV season selector and improved episode browsing
- Previous/next episode navigation
- Playback navigation layering fix
- Accent-colored favorite heart
- Responsive desktop, tablet and mobile styling

## Installation

1. Install and enable **File Transformation**:
   https://github.com/IAmMrCarter/jellyfin-plugin-file-transformation
2. In Jellyfin, open **Dashboard → Plugins → Repositories**.
3. Add:
   https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json
4. Install **DINKFLIX** from the plugin catalog.
5. Restart Jellyfin.
6. Open **Dashboard → Plugins → DINKFLIX**.
7. Refresh the Jellyfin web client.

## Compatibility

DINKFLIX targets Jellyfin 12.x. It enhances Jellyfin's presentation layer and leaves Jellyfin's native server, playback and route system in place.

## Credits

DINKFLIX is maintained by **Orvlyn**.

The project evolved from the **SleekFin** foundation by **varunaditya-plus** and its contributors:
https://github.com/varunaditya-plus/SleekFin

The upstream work remains credited under its applicable license. DINKFLIX is a separate rebrand/modification project.

## Optional integrations

Jellyfin Enhanced: https://github.com/JoelLaplante/jellyfin-enhanced  
SeerrFin: https://github.com/arnesacnussem/jellyfin-plugin-seerr

