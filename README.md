<div align="center">

<img src="https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/assets/logo_dark.png" alt="DINKFLIX" width="280" />

# DINKFLIX

**A cinematic, dark and premium visual experience for Jellyfin.**

[![Jellyfin](https://img.shields.io/badge/Jellyfin-12.x-00ffc6?style=flat-square&logo=jellyfin&logoColor=111111)](https://jellyfin.org/)
[![Build](https://img.shields.io/github/actions/workflow/status/Orvlyn/DinkFlix/release.yml?style=flat-square&label=build)](https://github.com/Orvlyn/DinkFlix/actions)
[![License](https://img.shields.io/github/license/Orvlyn/DinkFlix?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Orvlyn/DinkFlix?style=flat-square&color=00ffc6)](https://github.com/Orvlyn/DinkFlix/releases/latest)

</div>

---

## The DINKFLIX Experience

DINKFLIX is a full visual redesign for Jellyfin built around a cinematic dark interface, generous spacing, restrained typography, and the signature mint accent **`#00ffc6`**.

The goal is simple: make Jellyfin feel like a polished personal streaming platform without replacing Jellyfin itself.  
It works with Jellyfin’s native navigation, authentication, libraries, playback, administration, and plugin ecosystem wherever supported.

> Built on the excellent foundation of **[SleekFin](https://github.com/varunaditya-plus/SleekFin)** by varunaditya-plus.

### Design Direction

- **Premium dark interface** — a cinematic foundation designed for long viewing sessions  
- **DINKFLIX identity** — custom branding, logos, visual language, and mint highlights  
- **Spacious layouts** — less visual clutter, clearer hierarchy, and breathing room around content  
- **Refined typography** — cleaner, lighter text treatment instead of overly heavy fonts  
- **Cinematic media presentation** — redesigned hero areas, media rows, cards, and detail pages  
- **Responsive experience** — layouts that stay usable across desktop, tablet, and mobile  
- **Native Jellyfin foundation** — enhances Jellyfin rather than creating a separate streaming app  
- **Plugin-aware interface** — integrates with navigation elements from compatible plugins  

---

## Features

DINKFLIX is an evolving theme and interface project. Current work includes:

| Area | What it delivers |
|------|------------------|
| **Branding & Theme** | Full DINKFLIX visual language, global dark theme, and mint accent system |
| **Header & Navigation** | Compact floating header, responsive behavior, and mobile navigation support |
| **Home Hero** | Multi-slide home hero with bottom-right indicator pills |
| **Media Presentation** | Refined cards, cleaner metadata, and improved media rows |
| **Detail Pages** | Redesigned Movie, Series, Season, and Episode pages with richer information |
| **Navigation UX** | Horizontal detail-page navigation, in-page season selection, previous/next episode controls |
| **Continue Watching** | Persistent removal from Continue Watching using Jellyfin user data |
| **Favorites** | Heart styling that uses the active DINKFLIX accent |
| **Playback** | Scoped player back/exit hit-area protection and media-control adjustments |
| **Customization** | UI Builder controls (header, hero, layout) inherited from the SleekFin foundation |
| **Plugin Integration** | Awareness of Jellyfin Enhanced, SeerrFin, and other compatible navigation elements |

> Some features depend on the Jellyfin version, enabled plugins, and current development state. DINKFLIX is an active project — treat it as evolving rather than a guarantee of compatibility with every plugin combination.

---

## Screenshots

<!-- Replace the placeholders below with real screenshots -->

<table>
  <tr>
    <td colspan="2" align="center">
      <strong>Home</strong><br>
      <img src="assets/screenshots/home.png" alt="DINKFLIX Home" width="100%" />
      <!-- Suggested: full-width home view showing the multi-slide hero + media rows -->
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>Movie Detail</strong><br>
      <img src="assets/screenshots/movie-detail.png" alt="Movie Detail" width="100%" />
      <!-- Suggested: movie page with backdrop hero, title art, and metadata -->
    </td>
    <td align="center">
      <strong>Series Detail</strong><br>
      <img src="assets/screenshots/series-detail.png" alt="Series Detail" width="100%" />
      <!-- Suggested: series page with season selector and episode list -->
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>Library / Cards</strong><br>
      <img src="assets/screenshots/library.png" alt="Library Cards" width="100%" />
      <!-- Suggested: clean card grid with refined metadata -->
    </td>
    <td align="center">
      <strong>Mobile / Responsive</strong><br>
      <img src="assets/screenshots/mobile.png" alt="Mobile View" width="100%" />
      <!-- Suggested: mobile header + home or detail view -->
    </td>
  </tr>
</table>

<details>
<summary><strong>More screenshots</strong></summary>

| View | Description |
|------|-------------|
| Login | Custom branded login experience |
| Continue Watching | Hero + progress styling |
| Episode Page | Previous/next controls and episode metadata |
| Player Controls | Scoped back/exit hit areas and mint accents |
| Header Customization | UI Builder drag-and-drop elements |

<!-- Add more image rows here as you capture them -->

</details>

---

## Required & Recommended Plugins

### Required

- **[File Transformation](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation)**  
  Required for injecting DINKFLIX frontend/theme assets into Jellyfin.  
  Install and enable this plugin before expecting visual changes to appear.

### Recommended / Optional

- **[Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced)** — Adds extra interface functionality and navigation elements that DINKFLIX can integrate with.
- **[SeerrFin](https://github.com/arnesacnussem/jellyfin-plugin-seerr)** — Useful if you use Seerr/Jellyseerr for requests. Not required for core theme functionality.

> Plugin availability and compatibility can change with Jellyfin and third-party updates. Install only what you actually use.

---

## Installation

### Prerequisites

- A running **Jellyfin 12.x** instance  
- **File Transformation** plugin installed and enabled  

### Install from Plugin Catalog

1. Open **Dashboard → Plugins → Manage Repositories**
2. Click **New Repository** and paste:

```text
https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json
