# DINKFLIX

DINKFLIX is a custom Jellyfin Web theme and visual enhancement project maintained by **Orvlyn**. It is designed to make a personal Jellyfin server feel more like a polished streaming platform while keeping Jellyfin itself in control of your libraries, playback, authentication, navigation, administration and server-side functionality.

## What DINKFLIX changes

DINKFLIX focuses on the presentation layer: cinematic home-page hero content, cleaner media cards, richer detail pages, responsive navigation, refined controls and a darker premium visual system built around the DINKFLIX mint accent `#00ffc6`.

The current frontend includes hero slide pills, persistent Continue Watching removal, richer movie and series metadata, detail-page scroller controls, in-page season selection, episode navigation and safer interaction with Jellyfin's native playback controls.

DINKFLIX does **not** replace Jellyfin's playback engine, server APIs, authentication flow or native application routes. It enhances the existing Jellyfin Web client and uses Jellyfin's existing API surface where an action needs to persist data.

## Installation

### 1. Install File Transformation

DINKFLIX uses Jellyfin's File Transformation plugin to inject its web assets.

Install **File Transformation** from Jellyfin's plugin catalog and enable it before installing/activating DINKFLIX.

### 2. Add the DINKFLIX repository

In Jellyfin open:

**Dashboard → Plugins → Repositories → Add**

Use:

```text
https://raw.githubusercontent.com/Orvlyn/DinkFlix/main/manifest.json
```

Save the repository.

### 3. Install DINKFLIX

Open **Dashboard → Plugins → Catalog**, find **DINKFLIX**, and install the newest release available for your Jellyfin version.

Restart Jellyfin when prompted.

### 4. Refresh Jellyfin Web

Open Jellyfin in your browser and perform a hard refresh after installation.

If an older theme remains visible, clear the browser cache for your Jellyfin site and reload.

### 5. Configure DINKFLIX

Open the DINKFLIX plugin configuration page in the Jellyfin Dashboard. The available settings cover the custom header, hero, presentation and related UI options.

DINKFLIX is designed to layer on top of Jellyfin rather than replace the server's own controls.

## Using the main features

### Hero

The home-page hero can contain multiple content sources depending on your configuration. The pills in the lower-right corner show which slide is active and let you jump directly between available slides.

### Continue Watching

The **Remove from Continue Watching** control clears Jellyfin's resume position for that item. Because the change is written to Jellyfin's user-data, it persists after refreshes and across normal sessions.

### Detail pages

DINKFLIX adds richer technical information when Jellyfin provides it, including video format/resolution, subtitle availability, genres, director, writer and studio.

Native horizontal Jellyfin content rows retain their normal navigation. DINKFLIX only improves their presentation and hit areas.

### TV shows

On a series detail page, seasons can be selected directly on the same page using the DINKFLIX season pills. Episode rows include dedicated previous/next controls for moving through the episode list without replacing Jellyfin's own routing.

### Favorites

The native Jellyfin favorite action is retained. When an item is a favorite, DINKFLIX presents the heart in the active DINKFLIX accent.

### Playback

DINKFLIX's playback fix is intentionally scoped to the Jellyfin player UI. It protects the native back/exit control from visual layers intercepting the click; it does not replace the player route or playback controller.

## Compatibility approach

DINKFLIX is built to preserve Jellyfin's existing routes and server behavior.

Some legacy internal plugin identifiers remain in the C# assembly/controller layer specifically so existing installations and saved configuration continue to work. Those compatibility identifiers are not part of the user-facing DINKFLIX branding.

DINKFLIX currently targets the Jellyfin 12.x plugin environment represented by this repository. Always check the release's target ABI before installing on a different Jellyfin branch.

## Credits

DINKFLIX is designed, maintained and modified by **Orvlyn**.

The project builds on the **SleekFin** foundation by its original author and contributors. SleekFin's original work remains credited to the upstream project, and the applicable upstream license and attribution requirements remain in force.

Upstream project:

https://github.com/varunaditya-plus/SleekFin

Jellyfin:

https://jellyfin.org/

File Transformation:

https://github.com/IAmMrCarter/jellyfin-plugin-file-transformation

Optional integrations such as Jellyfin Enhanced and SeerrFin remain separate third-party projects owned by their respective authors.

## Project status

DINKFLIX is an ongoing project. Jellyfin's web client and third-party plugins can change over time, so compatibility should always be checked against the version running on your server.

The design goal is simple: **make Jellyfin feel better without taking Jellyfin away.**


<!-- Release marker: v11.5.0.0 -->
